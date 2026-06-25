// controllers/dataController.js
const sql = require("mssql");
const connection = require("../connection/connection");
const transporter = require("../mailer");
const { generateOTP } = require("../utils");
const dbConfig = require("../config/dbConfig");
const multer = require("multer");
const CryptoJS = require("crypto-js");
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const otpStorage = {};

// const CONFIG_PASSPHRASE = process.env.CONFIG_PASSPHRASE;
// const CONFIG_PASSPHRASE = process.env.CONFIG_PASSPHRASE || "Chanakya";
const CONFIG_PASSPHRASE = "YJKTechnologies";

// --- Detect if running inside pkg executable ---
const isPkg = typeof process.pkg !== "undefined";

// --- Resolve correct license file path ---
const LICENSE_FILE = isPkg
  ? path.join(path.dirname(process.execPath), "license.config") // when running as pkg EXE
  : path.resolve(__dirname, "../license.config"); // when running normally in Node

// --- AES-256-GCM decryption ---
function aesGcmDecryptPayload(payload, passphrase) {
  if (!payload || typeof payload !== "string")
    throw new Error("Invalid payload");
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid payload format");
  const [ivB64, ciphertextB64, authTagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(ciphertextB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const key = crypto.createHash("sha256").update(String(passphrase)).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

// --- Get current hostname and serial ---
function getHostname() {
  return os.hostname().trim();
}
function getSerialNumber() {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      try {
        const out = execSync("wmic bios get serialnumber")
          .toString()
          .split("\n")[1];
        if (out && out.trim()) return out.trim();
      } catch {}
      try {
        const psOut = execSync(
          'powershell -Command "(Get-WmiObject Win32_BIOS).SerialNumber"',
        ).toString();
        if (psOut && psOut.trim()) return psOut.trim();
      } catch {}
      return "UNKNOWN_SERIAL";
    } else if (platform === "linux") {
      try {
        const out = execSync("cat /sys/class/dmi/id/product_serial")
          .toString()
          .trim();
        if (out) return out;
      } catch {}
      try {
        const out = execSync("dmidecode -s system-serial-number")
          .toString()
          .trim();
        if (out) return out;
      } catch {}
      return "UNKNOWN_SERIAL";
    } else if (platform === "darwin") {
      try {
        const out = execSync(
          "ioreg -l | awk '/IOPlatformSerialNumber/ { print $4;}'",
        ).toString();
        return out.replace(/\"/g, "").trim() || "UNKNOWN_SERIAL";
      } catch {}
      return "UNKNOWN_SERIAL";
    }
    return "UNKNOWN_SERIAL";
  } catch {
    return "UNKNOWN_SERIAL";
  }
}

// --- Validate license ---
function validateLicense() {
  if (!fs.existsSync(LICENSE_FILE)) throw new Error("License file not found");
  const encryptedContent = fs.readFileSync(LICENSE_FILE, "utf8").trim();
  const config = aesGcmDecryptPayload(encryptedContent, CONFIG_PASSPHRASE);

  const currentHostname = getHostname();
  const currentSerial = getSerialNumber();

  if (
    config.machineInfo.hostname !== currentHostname ||
    config.machineInfo.serial !== currentSerial
  ) {
    throw new Error("Machine not authorized for this license");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(config.license.expiryDate);
  expiryDate.setHours(0, 0, 0, 0);

  // 15 days before expiry
  const warningDate = new Date(expiryDate);
  warningDate.setDate(warningDate.getDate() - 14);

  // 6 months after expiry
  const corruptedDate = new Date(expiryDate);
  corruptedDate.setMonth(corruptedDate.getMonth() + 6);

  let supportStatus = "NORMAL";
  let supportMessage = "";

  if (today >= warningDate && today <= expiryDate) {
  supportStatus = "WARNING";
  supportMessage = "Application Support Expiring Soon";
  }
  else if (today > expiryDate && today < corruptedDate) {
    supportStatus = "EXPIRED";
    supportMessage = "Please Contact Application Head Office";
  }
  else if (today >= corruptedDate) {
    supportStatus = "CORRUPTED";
    supportMessage = "Application Corrupted";
  }

  return {
    config,
    supportStatus,
    supportMessage
  };
}

//   const today = new Date();
//   const expiryDate = new Date(config.license.expiryDate);
//   console.log(expiryDate);
//   console.log(today);
//   if (expiryDate < today) throw new Error("License has expired");

//   return config; // valid license data
// }

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: "alert@yjktechnologies.com",
    to: email,
    subject: "Login OTP",
    text: `Your OTP is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending OTP:", err);
    throw new Error("Error sending OTP");
  }
};

const forgetPassword = async (req, res) => {
  const { user_code, email_id } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "VE")
      .input("user_code", sql.NVarChar, user_code)
      .input("email_id", sql.NVarChar, email_id)
      .query(
        `EXEC sp_user_info_hdr @mode,'',@user_code,'','','','','','','',@email_id,'','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );
    if (result.recordset.length > 0) {
      const otp = generateOTP();
      await sendOTP(email_id, otp);

      otpStorage[email_id] = otp;

      res.status(200).json({ message: "OTP sent successfully" });
    } else {
      res.status(401).json({ message: "Email not found" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const Passwords = async (req, res) => {
  const { user_code, email_id, user_password } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "UP")
      .input("user_code", sql.NVarChar, user_code)
      .input("email_id", sql.NVarChar, email_id)
      .input("user_password", sql.NVarChar, user_password)
      .query(
        "EXEC sp_user_info_hdr @mode,'',@user_code,'','','',@user_password,'','','',@email_id,'','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

// const login = async (req, res) => {
//   const { user_code, user_password } = req.body;
//   const secretKey = "yjk26012024";

//   try {
//     // try {
//     //   validateLicense();
//     // } catch (licenseErr) {
//     //   return res
//     //     .status(403)
//     //     .json({ success: false, message: licenseErr.message });
//     // }
//     let licenseInfo;

//     try {
//       licenseInfo = validateLicense();
//     } catch (licenseErr) {
//       return res
//         .status(403)
//         .json({ success: false, message: licenseErr.message });
//     }

//     const decryptedUserCode = CryptoJS.AES.decrypt(
//       user_code,
//       secretKey,
//     ).toString(CryptoJS.enc.Utf8);
//     const decryptedPassword = CryptoJS.AES.decrypt(
//       user_password,
//       secretKey,
//     ).toString(CryptoJS.enc.Utf8);

//     const pool = await connection.connectToDatabase();
//     const result = await pool
//       .request()
//       .input("mode", sql.NVarChar, "LUC")
//       .input("user_code", sql.NVarChar, decryptedUserCode)
//       .input("user_password", sql.NVarChar, decryptedPassword)
//       .query(
//         `EXEC sp_user_info_hdr 'LUC','',@user_code,'','','',@user_password,'','','','','','','','','','','','','','','','','','','',''`,
//       );
//     // if (result.recordset.length > 0) {
//     //   res.status(200).json(result.recordset);
//     // }
//     if (result.recordset.length > 0) {
//       res.status(200).json({
//         userData: result.recordset,
//         supportStatus: licenseInfo.supportStatus,
//         supportMessage: licenseInfo.supportMessage,
//       });
//     }
//      else { 
//       res.status(404).json("Data not found");
//     }
//   } catch (err) {
//     console.error("Error", err.message);
//     res.status(500).json({ message: err.message || "Internal Server Error" });
//   }
// };

const login = async (req, res) => {
  const { user_code, user_password } = req.body;
  const secretKey = "yjk26012024";

  try {
    let licenseInfo;

    try {
      licenseInfo = validateLicense();
    } catch (licenseErr) {
      return res.status(403).json({
        success: false,
        message: licenseErr.message,
      });
    }

    // ONLY ADD THIS STRICT BLOCK
    if (licenseInfo.supportStatus === "CORRUPTED") {
      return res.status(403).json({
        success: false,
        supportStatus: "CORRUPTED",
        supportMessage: licenseInfo.supportMessage,
        message: "Application Corrupted - Login Blocked",
      });
    }

    // decrypt credentials (unchanged)
    const decryptedUserCode = CryptoJS.AES.decrypt(
      user_code,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    const decryptedPassword = CryptoJS.AES.decrypt(
      user_password,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    const pool = await connection.connectToDatabase();

    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "LUC")
      .input("user_code", sql.NVarChar, decryptedUserCode)
      .input("user_password", sql.NVarChar, decryptedPassword)
      .query(
        `EXEC sp_user_info_hdr 'LUC','',@user_code,'','','',@user_password,'','','','','','','','','','','','','','','','','','','',''`
      );

    if (result.recordset.length > 0) {
      return res.status(200).json({
        userData: result.recordset,
        supportStatus: licenseInfo.supportStatus,
        supportMessage: licenseInfo.supportMessage,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Data not found",
      });
    }
  } catch (err) {
    console.error("Error", err.message);
    res.status(500).json({
      message: err.message || "Internal Server Error",
    });
  }
};
const getUsercode = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      "EXEC sp_user_info_hdr 'F','','user_code','','', '' ,'','','','','','','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
    );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAlluserData = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      `EXEC sp_user_info_hdr 'A','','','','','','','','','','','','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

// AES-256-GCM encrypt
function aesGcmEncryptJson(obj, passphrase) {
  const plaintext = JSON.stringify(obj, null, 2);
  const key = crypto.createHash("sha256").update(String(passphrase)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return (
    iv.toString("base64") +
    ":" +
    ciphertext.toString("base64") +
    ":" +
    authTag.toString("base64")
  );
}

const userAddData = async (req, res) => {
  const {
    company_code,
    user_code,
    user_name,
    first_name,
    last_name,
    user_password,
    user_status,
    log_in_out,
    user_type,
    email_id,
    dob,
    gender,
    role_id,
    expiry_date,
    super_admin,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;

  let user_img = null;

  if (req.file) {
    user_img = req.file.buffer; // Buffer containing the uploaded image
  }
  try {
    // --- Step 1: Decrypt license/config file ---
    if (!fs.existsSync(LICENSE_FILE)) {
      throw new Error("License file not found");
    }
    let encryptedContent = fs.readFileSync(LICENSE_FILE, "utf8").trim();
    let licenseData = aesGcmDecryptPayload(encryptedContent, CONFIG_PASSPHRASE);
    // --- Optional: Date Format for license expiry date To show in toast  ---
    const formattedLicenseExpiry = new Date(
      licenseData.license.expiryDate,
    ).toLocaleDateString("en-GB");
    // --- Step 2: Validate user expiry date against license expiry date ---
    const licenseExpiry = new Date(licenseData.license.expiryDate);
    const userExpiry = new Date(expiry_date);

    licenseExpiry.setHours(0, 0, 0, 0);
    userExpiry.setHours(0, 0, 0, 0);

    // if (userExpiry > licenseExpiry) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `User expiry date cannot exceed license expiry date (${formattedLicenseExpiry})`,
    //   });
    // }

    // --- Step 2: Check remaining user count ---
    if (licenseData.license.noOfUsers <= 0) {
      return res.status(400).json({
        success: false,
        message: "No more users can be created. License limit reached.",
      });
    }

    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.NVarChar, user_code)
      .input("user_name", sql.NVarChar, user_name)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("user_password", sql.NVarChar, user_password)
      .input("user_status", sql.NVarChar, user_status)
      .input("log_in_out", sql.NVarChar, log_in_out)
      .input("user_type", sql.NVarChar, user_type)
      .input("email_id", sql.NVarChar, email_id)
      .input("dob", sql.NVarChar, dob)
      .input("gender", sql.NVarChar, gender)
      .input("role_id", sql.NVarChar, role_id)
      .input("user_img", sql.VarBinary, user_img)
      .input("expiry_date", sql.NVarChar, expiry_date)
      .input("super_admin", sql.NVarChar, super_admin)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_user_info_hdr @mode,@company_code,@user_code,@user_name,@first_name,@last_name,@user_password,@user_status,@log_in_out,@user_type,@email_id,@dob,@gender,@role_id,@user_img,@expiry_date,@super_admin,@created_by,@modified_by,@tempstr1, @tempstr2, @tempstr3, @tempstr4,@datetime1, @datetime2, @datetime3, @datetime4`,
      );

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      // --- Step 4: Decrement noOfUsers and re-encrypt config ---
      licenseData.license.noOfUsers -= 1;
      const newEncrypted = aesGcmEncryptJson(licenseData, CONFIG_PASSPHRASE);
      fs.writeFileSync(LICENSE_FILE, newEncrypted, "utf8");

      return res.status(200).json({
        success: true,
        message: "Data inserted successfully",
        remainingUsers: licenseData.license.noOfUsers,
      });
    }
  } catch (err) {
    if (err.class === 16 && err.number === 50000) {
      // Custom error from the stored procedure
      res
        .status(400)
        .json({ message: "User already exists", err: err.message });
    } else {
      // Handle unexpected errors
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  }
};

const formatDateForSQL = (dateStr) => {
  if (!dateStr) return null;

  const [dd, mm, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
};

const UsersaveEditedData = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }

  try {
    // Read License File
    const encryptedContent = fs.readFileSync(LICENSE_FILE, "utf8");
    const licenseData = aesGcmDecryptPayload(
      encryptedContent,
      CONFIG_PASSPHRASE,
    );
    const formattedLicenseExpiry = new Date(
      licenseData.license.expiryDate
    ).toLocaleDateString("en-GB");

    const licenseExpiry = new Date(licenseData.license.expiryDate);
    licenseExpiry.setHours(0, 0, 0, 0);

    const pool = await connection.connectToDatabase(dbConfig);

    for (const updatedRow of editedData) {
      const rowExpiry = new Date(updatedRow.expiry_date);
      rowExpiry.setHours(0, 0, 0, 0);

      if (rowExpiry > licenseExpiry) {
        return res.status(400).json({
          success: false,
          message: `User ${updatedRow.user_code} expiry date cannot exceed license expiry date (${formattedLicenseExpiry})`,
        });
      }
      await pool
        .request()
        .input("mode", sql.NVarChar, "U") // update mode
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("user_code", sql.NVarChar, updatedRow.user_code)
        .input("user_name", sql.NVarChar, updatedRow.user_name)
        .input("first_name", sql.NVarChar, updatedRow.first_name)
        .input("last_name", sql.NVarChar, updatedRow.last_name)
        .input("user_password", sql.NVarChar, updatedRow.user_password)
        .input("user_status", sql.NVarChar, updatedRow.user_status)
        .input("log_in_out", sql.NVarChar, updatedRow.log_in_out)
        .input("user_type", sql.NVarChar, updatedRow.user_type)
        .input("email_id", sql.NVarChar, updatedRow.email_id)
        .input("dob", sql.NVarChar, formatDateForSQL(updatedRow.dob))
        .input("gender", sql.NVarChar, updatedRow.gender)
        .input("role_id", sql.NVarChar, updatedRow.role_id)
        .input("expiry_date", sql.NVarChar, formatDateForSQL(updatedRow.expiry_date))
        .input("created_by", sql.NVarChar, updatedRow.created_by)
        .input("super_admin", sql.NVarChar, updatedRow.super_admin)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", sql.NVarChar, updatedRow.tempstr1)
        .input("tempstr2", sql.NVarChar, updatedRow.tempstr2)
        .input("tempstr3", sql.NVarChar, updatedRow.tempstr3)
        .input("tempstr4", sql.NVarChar, updatedRow.tempstr4)
        .input("datetime1", sql.NVarChar, updatedRow.datetime1)
        .input("datetime2", sql.NVarChar, updatedRow.datetime2)
        .input("datetime3", sql.NVarChar, updatedRow.datetime3)
        .input("datetime4", sql.NVarChar, updatedRow.datetime4)
        .query(`EXEC sp_user_info_hdr @mode,@company_code, @user_code, @user_name, @first_name, @last_name, @user_password, @user_status, @log_in_out, @user_type, 
        @email_id, @dob, @gender, @role_id, '', @expiry_date, @super_admin, @created_by, @modified_by, @tempstr1, @tempstr2, @tempstr3, @tempstr4, @datetime1, @datetime2, @datetime3, @datetime4`);
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const UserdeleteData = async (req, res) => {
  const user_codesToDelete = req.body.user_codes;

  if (!user_codesToDelete || !user_codesToDelete.length) {
    res.status(400).json("Invalid or empty user_codes array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const user_code of user_codesToDelete) {
      await pool
        .request()
        .input("user_code", user_code)
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .query(`EXEC sp_user_info_hdr 'D',@company_code,@user_code,'','','','','','','','','','','','','','','',@modified_by,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);
    }

    res.status(200).json("user deleted successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getUsersearchdata = async (req, res) => {
  const {
    company_code,
    user_code,
    user_name,
    first_name,
    last_name,
    user_status,
    email_id,
    dob,
    gender,
    role_id,
    created_by,
  } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.NVarChar, user_code)
      .input("user_name", sql.NVarChar, user_name)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("user_status", sql.NVarChar, user_status)
      .input("email_id", sql.NVarChar, email_id)
      .input("dob", sql.NVarChar, dob)
      .input("gender", sql.NVarChar, gender)
      .input("role_id", sql.NVarChar, role_id)
      .input("created_by", sql.NVarChar, created_by)
      .query(`EXEC sp_user_info_hdr @mode,@company_code,@user_code,@user_name,@first_name,@last_name,'',@user_status,'','',@email_id,@dob,@gender,@role_id,'','','',@created_by,'','','','','','','','',''`);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const UpdateUserImage = async (req, res) => {
  const { user_code } = req.body;

  let user_img = null;

  if (req.file) {
    user_img = req.file.buffer; // Buffer containing the uploaded image
  }
  try {
    // Check if the user exists in the database
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("user_code", sql.NVarChar, user_code)
      .input("user_img", sql.VarBinary, user_img)
      .query(`EXEC sp_user_info_hdr 'UI','',@user_code,'','','','','','','','','','','',@user_img,'','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (error) {
    if (error.class === 16 && error.number === 50000) {
      // Custom error from the stored procedure
      res
        .status(400)
        .json({ message: "User already exists", error: error.message });
    } else {
      // Handle unexpected errors
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  }
};

const UserUpdate = async (req, res) => {
  const {
    company_code,
    user_code,
    user_name,
    first_name,
    last_name,
    user_password,
    user_status,
    log_in_out,
    user_type,
    email_id,
    dob,
    gender,
    role_id,
    expiry_date,
    super_admin,
    created_by,
    modified_by,
  } = req.body;

  let user_images = null;

  if (req.file) {
    user_images = req.file.buffer;
  }

  try {
    const encryptedContent = fs.readFileSync(LICENSE_FILE, "utf8");
    const licenseData = aesGcmDecryptPayload(
      encryptedContent,
      CONFIG_PASSPHRASE,
    );
    const formattedLicenseExpiry = new Date(
      licenseData.license.expiryDate
    ).toLocaleDateString("en-GB");

    const licenseExpiry = new Date(licenseData.license.expiryDate);
    const userExpiry = new Date(expiry_date);

    licenseExpiry.setHours(0, 0, 0, 0);
    userExpiry.setHours(0, 0, 0, 0);

    // if (userExpiry > licenseExpiry) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `User expiry date cannot exceed license expiry date (${formattedLicenseExpiry})`,
    //   });
    // }

    pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U") // update mode
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.NVarChar, user_code)
      .input("user_name", sql.NVarChar, user_name)
      .input("first_name", sql.NVarChar, first_name)
      .input("last_name", sql.NVarChar, last_name)
      .input("user_password", sql.NVarChar, user_password)
      .input("user_status", sql.NVarChar, user_status)
      .input("log_in_out", sql.NVarChar, log_in_out)
      .input("user_type", sql.NVarChar, user_type)
      .input("email_id", sql.NVarChar, email_id)
      .input("dob", sql.NVarChar, dob)
      .input("gender", sql.NVarChar, gender)
      .input("role_id", sql.NVarChar, role_id)
      .input("user_images", sql.VarBinary, user_images)
      .input("expiry_date", sql.NVarChar, expiry_date)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("super_admin", sql.NVarChar, super_admin)
      .query(`EXEC sp_user_info_hdr @mode,@company_code, @user_code, @user_name, @first_name, @last_name, @user_password, @user_status, @log_in_out, @user_type, 
      @email_id, @dob, @gender, @role_id, @user_images, @expiry_date, @super_admin, @created_by, @modified_by, '', '', '', '', '', '', '', ''`);
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const Userdropdown = async (req, res) => {
  const { user_code } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "MG")
      .input("user_code", sql.NVarChar, user_code)
      .query(`EXEC [sp_user_info_hdr] @mode,'',@user_code,'','','','','','','','','','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`); 
    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const addattrihdrData = async (req, res) => {
  const {
    company_code,
    attributeheader_code,
    attributeheader_name,
    status,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I")
      .input("company_code", sql.NVarChar, company_code)
      .input("attributeheader_code", sql.NVarChar, attributeheader_code)
      .input("attributeheader_name", sql.NVarChar, attributeheader_name)
      .input("status", sql.NVarChar, status)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_attribute_hdr @mode,@company_code,@attributeheader_code,@attributeheader_name,@status,@created_by,@modified_by,@tempstr1,@tempstr2,@tempstr3,@tempstr4,@datetime1,@datetime2,@datetime3,@datetime4`,
      );

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    {
      // Handle unexpected errors
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  }
};

const RoleUpdate = async (req, res) => {
  const {
    company_code,
    role_id,
    role_name,
    description,
    created_by,
    modified_by,
  } = req.body;
  let pool;
  try {
    pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U") // update mode
      .input("company_code", sql.NVarChar, company_code)
      .input("role_id", sql.NVarChar, role_id)
      .input("role_name", sql.NVarChar, role_name)
      .input("description", sql.NVarChar, description)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(
        `EXEC sp_Role_Info @mode,@company_code,@role_id,@role_name,@description,@created_by,@modified_by,'','',
          '','','','','',''`,
      );

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getUserRole = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        `EXEC sp_role_info 'UR',@company_code,'','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};

const roledeleteData = async (req, res) => {
  const role_idsToDelete = req.body.role_ids;

  if (!role_idsToDelete || !role_idsToDelete.length) {
    res.status(400).json("Invalid or empty RoleID array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const role_id of role_idsToDelete) {
      try {
        await pool
          .request()
          .input("role_id", role_id)
          .input("modified_by", sql.NVarChar, req.headers["modified-by"])
          .input("company_code", sql.NVarChar, req.headers["company_code"])
          .query(`
          EXEC sp_Role_Info 'D',@company_code,@role_id,'','','',@modified_by,
        NULL, NULL, NULL, NULL,NULL, NULL, NULL, NULL
          `);
      } catch (err) {
        if (err.number === 50000) {
          // Foreign key constraint violation
          res
            .status(400)
            .json(
              "The role cannot be deleted due to a link with another record",
            );
          return;
        } else {
          throw err; // Rethrow other SQL errors
        }
      }
    }

    res.status(200).json("User deleted successfully");
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const getRolesearchdata = async (req, res) => {
  const { company_code, role_id, role_name } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.NVarChar, company_code)
      .input("role_id", sql.NVarChar, role_id)
      .input("role_name", sql.NVarChar, role_name)
      .query(
        `EXEC sp_Role_Info @mode,@company_code,@role_id,@role_name,'','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const RolesaveEditedData = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase(dbConfig);

    for (const updatedRow of editedData) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "U") // update mode
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("role_id", sql.NVarChar, updatedRow.role_id)
        .input("role_name", sql.NVarChar, updatedRow.role_name)
        .input("description", sql.NVarChar, updatedRow.description)
        .input("created_by", sql.NVarChar, updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", sql.NVarChar, updatedRow.tempstr1)
        .input("tempstr2", sql.NVarChar, updatedRow.tempstr2)
        .input("tempstr3", sql.NVarChar, updatedRow.tempstr3)
        .input("tempstr4", sql.NVarChar, updatedRow.tempstr4)
        .input("datetime1", sql.NVarChar, updatedRow.datetime1)
        .input("datetime2", sql.NVarChar, updatedRow.datetime2)
        .input("datetime3", sql.NVarChar, updatedRow.datetime3)
        .input("datetime4", sql.NVarChar, updatedRow.datetime4)
        .query(
          `EXEC sp_Role_Info @mode,@company_code,@role_id,@role_name,@description,@created_by,@modified_by,@tempstr1,@tempstr2,
          @tempstr3,@tempstr4,@datetime1,@datetime2,@datetime3,@datetime4
          `,
        );
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const AddRoleInfoData = async (req, res) => {
  const {
    company_code,
    role_id,
    role_name,
    description,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_code", sql.NVarChar, company_code)
      .input("role_id", sql.NVarChar, role_id)
      .input("role_name", sql.NVarChar, role_name)
      .input("description", sql.NVarChar, description)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(`EXEC sp_role_info @mode,@company_code, @role_id,
        @role_name,@description,
        @created_by,@modified_by,
        @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
        @datetime1, @datetime2, @datetime3, @datetime4`);

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    if (err.class === 16 && err.number === 50000) {
      // Custom error from the stored procedure
      res.status(400).json({ message: "Role already exists" });
    } else {
      // Handle unexpected errors
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  }
};

const getAllRoleInfoData = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      `EXEC sp_role_Info 'A','','','','','','','','','','','','','',''`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getroleid = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        `EXEC sp_role_info 'F',@company_code,'','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getUserPermission = async (req, res) => {
  const { role_id } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "UP")
      .input("role_id", sql.NVarChar, role_id)
      .query(`EXEC sp_rolescreen_mapping @mode,'',@role_id,'','','','','',null,null,null,null,null,null,null,null
  `);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};
const getuserscreensearchdata = async (req, res) => {
  const { company_code, role_id, screen_type, permission_type } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.VarChar, company_code)
      .input("role_id", sql.VarChar, role_id)
      .input("screen_type", sql.NVarChar, screen_type)
      .input("permission_type", sql.NVarChar, permission_type)
      .query(`EXEC sp_rolescreen_mapping @mode,@company_code,@role_id,@screen_type,@permission_type,'','','',
null,null,null,null,null,null,null,null`);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};

const userscreenmapdeleteData = async (req, res) => {
  const keyfieldsToDelete = req.body.keyfield;

  // if (!keyfieldsToDelete || !keyfieldsToDelete.length) {
  //   res.status(400).json("Invalid or empty company_nos array.");
  //   return;
  // }

  try {
    const pool = await connection.connectToDatabase();

    for (const keyfield of keyfieldsToDelete) {
      try {
        await pool
          .request()
          .input("keyfield", keyfield)
          .input("modified_by", sql.NVarChar, req.headers["modified-by"])
          .query(
            `EXEC sp_rolescreen_mapping 'D','','','','',@keyfield,'',@modified_by,null,null,null,null,null,null,null,null`,
          );
      } catch (error) {
        if (error.number === 50000) {
          // Foreign key constraint violation
          res
            .status(400)
            .json(
              "The user rights cannot be deleted due to a link with another record",
            );
          return;
        } else {
          throw error; // Rethrow other SQL errors
        }
      }
    }

    res.status(200).json("User screen mapping deleted successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const saveEditeduserscreenmap = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const updatedRow of editedData) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("company_code", updatedRow.company_code)
        .input("role_id", updatedRow.role_id)
        .input("screen_type", updatedRow.screen_type)
        .input("permission_type", updatedRow.permission_type)
        .input("keyfield", updatedRow.keyfield)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", updatedRow.tempstr1)
        .input("tempstr2", updatedRow.tempstr2)
        .input("tempstr3", updatedRow.tempstr3)
        .input("tempstr4", updatedRow.tempstr4)
        .input("datetime1", updatedRow.datetime1)
        .input("datetime2", updatedRow.datetime2)
        .input("datetime3", updatedRow.datetime3)
        .input("datetime4", updatedRow.datetime4)
        .query(`EXEC sp_rolescreen_mapping @mode,@company_code, @role_id, @screen_type, @permission_type, @keyfield,'', @modified_by,  
               @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
              @datetime1, @datetime2, @datetime3, @datetime4`);
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const adduserscreenmap = async (req, res) => {
  const {
    company_code,
    role_id,
    screen_type,
    permission_type,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_code", sql.NVarChar, company_code)
      .input("role_id", sql.VarChar, role_id)
      .input("screen_type", sql.NVarChar, screen_type)
      .input("permission_type", sql.VarChar, permission_type)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_rolescreen_mapping @mode, @company_code,@role_id, @screen_type,@permission_type,'',@created_by,'',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );
    res.json({ success: true, message: "Data inserted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};

const getAlluserscreenmap = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result =
      await sql.query(`EXEC sp_rolescreen_mapping 'A','','','','','','','',
                                      null,null,null,null,null,null,null,null `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getvariant = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Item_variant','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getuom = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'UOM','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getCity = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'city','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getCountry = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'country','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getState = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'state','',' ', ' ' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getStatus = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'status','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getShift = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Shift','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getTransaction = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Transaction Type','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getGender = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Gender','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
const getLoginorout = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Log IN/OUT','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getDeletepermission = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'deletepermission','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getregisterbrand = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Register_brand','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getourbrand = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'our_brand','','', '' , '','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const gethdrcode = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      "EXEC sp_attribute_Info 'TS','','', '','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getUsertype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'User Type', '','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getscreentype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Sc type', '','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPaytype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'paytype','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPurchasetype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'PutchaseType','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getSalestype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'SalesType','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getordertype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'ORDER TYPE','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAllattributedetData = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result =
      await sql.query(`EXEC sp_attribute_info 'A','','', '','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const addattridetData = async (req, res) => {
  const {
    company_code,
    attributeheader_code,
    attributedetails_code,
    attributedetails_name,
    descriptions,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;

  try {
    // Input validation
    if (!attributeheader_code) {
      return res
        .status(400)
        .json({ error: "Attribute Header Code cannot be blank" });
    }

    // Establish connection to the database
    const pool = await sql.connect(dbConfig);

    // Execute the stored procedure
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_code", sql.NVarChar, company_code)
      .input("attributeheader_code", sql.NVarChar, attributeheader_code)
      .input("attributedetails_code", sql.NVarChar, attributedetails_code)
      .input("attributedetails_name", sql.NVarChar, attributedetails_name)
      .input("descriptions", sql.NVarChar, descriptions)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_attribute_Info @mode,@company_code,@attributeheader_code, @attributedetails_code,@attributedetails_name,@descriptions,@created_by,@modified_by,@tempstr1, @tempstr2, @tempstr3, @tempstr4, 
          @datetime1, @datetime2, @datetime3, @datetime4`,
      );
    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    if (err.class === 16 && err.number === 50000) {
      // Custom error from the stored procedure
      res.status(400).json({ message: err.message });
    } else {
      // Handle unexpected errors
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  }
};

const deleteAttriDetailData = async (req, res) => {
  const { attributeheader_codesToDelete, attributedetails_codeToDelete } =
    req.body;

  if (
    !attributeheader_codesToDelete ||
    !attributeheader_codesToDelete.length ||
    !attributedetails_codeToDelete ||
    !attributedetails_codeToDelete.length
  ) {
    res.status(400).json("Invalid or empty Codes or codeDetails array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    const deleteQuery = `EXEC sp_attribute_Info 'D',@company_code,@attributeheader_code, @attributedetails_code,'','','',@modified_by,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
      `;
    for (let i = 0; i < attributeheader_codesToDelete.length; i++) {
      try {
        await pool
          .request()
          .input("attributeheader_code", attributeheader_codesToDelete[i])
          .input("attributedetails_code", attributedetails_codeToDelete[i])
          .input("modified_by", sql.NVarChar, req.headers["modified-by"])
          .input("company_code", sql.NVarChar, req.headers["company_code"])
          .query(deleteQuery);
      } catch (err) {
        if (err.number === 50000) {
          // Foreign key constraint violation
          res
            .status(400)
            .json(
              "The attribute cannot be deleted due to a link with another record",
            );
          return;
        } else {
          throw err; // Rethrow other SQL errors
        }
      }
    }

    res.status(200).json("Attribute data deleted successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const updattridetData = async (req, res) => {
  const {
    attributeheader_codesToUpdate,
    attributedetails_codesToUpdate,
    updatedData,
  } = req.body;

  if (
    !attributeheader_codesToUpdate ||
    !attributeheader_codesToUpdate.length ||
    !attributedetails_codesToUpdate ||
    !attributedetails_codesToUpdate.length ||
    !updatedData ||
    !updatedData.length
  ) {
    res.status(400).json("Invalid or empty input data.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (let i = 0; i < attributeheader_codesToUpdate.length; i++) {
      const updatedRow = updatedData[i]; // Assuming updatedData is an array of objects with updated values

      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("attributeheader_code", attributeheader_codesToUpdate[i])
        .input("attributedetails_code", attributedetails_codesToUpdate[i])
        .input(
          "attributedetails_name",
          sql.NVarChar,
          updatedRow.attributedetails_name,
        )
        .input("descriptions", sql.NVarChar, updatedRow.descriptions)
        .input("created_by", sql.NVarChar, updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", sql.NVarChar, updatedRow.tempstr1)
        .input("tempstr2", sql.NVarChar, updatedRow.tempstr2)
        .input("tempstr3", sql.NVarChar, updatedRow.tempstr3)
        .input("tempstr4", sql.NVarChar, updatedRow.tempstr4)
        .input("datetime1", sql.NVarChar, updatedRow.datetime1)
        .input("datetime2", sql.NVarChar, updatedRow.datetime2)
        .input("datetime3", sql.NVarChar, updatedRow.datetime3)
        .input("datetime4", sql.NVarChar, updatedRow.datetime4)
        .query(
          `EXEC sp_attribute_Info @mode,@company_code, @attributeheader_code, @attributedetails_code, @attributedetails_name, @descriptions, @created_by,@modified_by, @tempstr1, @tempstr2, @tempstr3, @tempstr4, @datetime1, @datetime2, @datetime3, @datetime4`,
        );
    }

    res.status(200).json("Updated data successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getattributeSearchdata = async (req, res) => {
  const {
    company_code,
    attributeheader_code,
    attributedetails_code,
    attributedetails_name,
    descriptions,
  } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.NVarChar, company_code)
      .input("attributeheader_code", sql.NVarChar, attributeheader_code)
      .input("attributedetails_code", sql.NVarChar, attributedetails_code)
      .input("attributedetails_name", sql.NVarChar, attributedetails_name)
      .input("descriptions", sql.NVarChar, descriptions)
      .query(`EXEC sp_attribute_Info 'SC',@company_code,@attributeheader_code,@attributedetails_code,@attributedetails_name,@descriptions,'','','','','','','','','',''
                  `);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const gettranstype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'TRANSATION','','', '','','' , NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getScreens = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Screens','',' ', ' ','','' , NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPermissions = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Permissions','',' ', ' ' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getacctype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'account type','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getofftype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'OfficeType','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getInventoryTransaction = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'InventoryTransacti','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getEmptype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'EmployeeType','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getCondition = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Condition','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const AttributeUpdate = async (req, res) => {
  const {
    company_code,
    attributeheader_code,
    attributedetails_code,
    attributedetails_name,
    descriptions,
    created_by,
    modified_by,
  } = req.body;

  let pool;
  try {
    pool = await connection.connectToDatabase();

    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("company_code", sql.NVarChar, company_code)
      .input("attributeheader_code", sql.NVarChar, attributeheader_code)
      .input("attributedetails_code", sql.NVarChar, attributedetails_code)
      .input("attributedetails_name", sql.NVarChar, attributedetails_name)
      .input("descriptions", sql.NVarChar, descriptions)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(
        `EXEC sp_attribute_Info @mode,@company_code, @attributeheader_code, @attributedetails_code, @attributedetails_name, @descriptions, @created_by,@modified_by, '', '', '', '', '', '', '', ''`,
      );
    res.status(200).json("Updated data successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
const getEvent = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Transactions Event','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getsiblings = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Siblings','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getkids = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Kids','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getMartial = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Marital Status','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getSalaryType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Salary Type','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPayscale = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Payscale','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getLoanID = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'LoanID','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
const getItem = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'product','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getDocumentType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'document type','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getrelation = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Relationship','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
const getannoncementtype = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'AnnouncementType','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAnnouncementDetail = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'AnnouncementDetail','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAnnouncement_Msg = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Announcement_Msg','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAnnouncement = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Annoucement','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getcompanyshift = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'ESS_SHIFT','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
const getOverallTAX = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'tax type','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAnnouncementDuration = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'AnnounceDuration','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPriority = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'PriorityLevel','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const PendingCustomer = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'PendingCustomer','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getTaskstatus = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Taskstatus','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPurchaseAnalysis = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Purchase','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getSalesMode = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'SalesMode','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getdefCustomer = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'DefaultCust','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPendingStatus = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'PendingStatus','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getLeaveReason = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Leave_Reason','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getExceedLeave = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Exceed_Leave','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAccrual = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'AccrualType','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Type','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getGSTReport = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info_test 'GF',@company_code,'GSTReport','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getPartyName = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'PartyName','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getGST = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'GST','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getDashBoardType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'DB Type','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getSelectSlot = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Select_Slot','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getLeaveType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'LeaveType','','', '' , '','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getInvocieType = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'F',@company_code,'Invoice Type','','', '' ,'','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

//code added by pavun on 19-03-25
const Fame_atten_report = async (req, res) => {
  const { from_date, to_date, dept_type } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "ASR")
      .input("from_date", sql.DateTime, from_date)
      .input("to_date", sql.DateTime, to_date)
      .input("dept_type", sql.NVarChar, dept_type)
      .query(
        `EXEC sp_attendance_summary_report @mode,@from_date,@to_date,@dept_type`,
      );
    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const Fame_atten_contract = async (req, res) => {
  const { from_date, to_date, emp_id, contractor_name } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.VarChar, "ASRC")
      .input("from_date", sql.DateTime, from_date)
      .input("to_date", sql.DateTime, to_date)
      .input("emp_id", sql.VarChar, emp_id)
      .input("contractor_name", sql.VarChar, contractor_name)
      .query(
        `EXEC sp_attendance_summary_report_for_contractors @mode,@from_date,@to_date,@emp_id,@contractor_name`,
      );
    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getDeptType_Atte_Report = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query("EXEC sp_attendance_get_types 'AR'");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getDeptType_Daily_Atte_Report = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query("EXEC sp_attendance_get_types 'DAR'");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getcontractorname = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query("EXEC sp_get_contract_details 'CN'");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const fame_emp_details = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(`EXEC sp_get_contract_details 'ED'`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const Fame_atten_machine_log_report = async (req, res) => {
  const { DT1, DT2 } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "AML")
      .input("DT1", sql.DateTime, DT1)
      .input("DT2", sql.DateTime, DT2)
      .query(`EXEC sp_Attendance_machine_log @mode,@DT1,@DT2`);
    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
//code ended by pavun

const getColumn = async (req, res) => {
  const { company_code } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("company_code", sql.NVarChar, company_code)
      .query(
        "EXEC sp_attribute_Info 'GF',@company_code,'Column','','', '','','', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getEmployeeBasicDetails = async (req, res) => {
  const { dept_type } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "EBD")
      .input("dept_type", sql.NVarChar, dept_type)
      .query(`EXEC sp_employee_master @mode,@dept_type,'',''`);
    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getEmployeesearchcriteria = async (req, res) => {
  const { column, value } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "ESC")
      .input("column", sql.NVarChar, column)
      .input("value", sql.NVarChar, value)
      .query(`EXEC sp_employee_master @mode,'',@column,@value`);
    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const GetemployeeFullDetails = async (req, res) => {
  const { value } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "EFD")
      .input("value", sql.NVarChar, value)
      .query(`EXEC sp_employee_master @mode,'','',@value`);
    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};

const GetCompanyCode = async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "GCC")
      .query(`EXEC sp_employee_master @mode,'','',''`);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const GetDeptCode = async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "GDC")
      .query(`EXEC sp_employee_master @mode,'','',''`);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const TemplateInsert = async (req, res) => {
  const { screen, name, settings, grid_value, gridcolumn_value } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "TI")
      .input("screen", sql.VarChar, screen)
      .input("name", sql.VarChar, name)
      .input("settings", sql.VarChar, settings)
      .input("gridcolumn_value", sql.VarChar, gridcolumn_value)
      .input("grid_value", sql.VarChar, grid_value)
      .query(
        `EXEC sp_report_template @mode,@screen,@name,@settings,@gridcolumn_value,@grid_value`,
      );
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Format Saved successfully" });
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const FetchTemplate = async (req, res) => {
  const { screen, name } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "TF")
      .input("screen", sql.VarChar, screen)
      .input("name", sql.VarChar, name)
      .query(`EXEC sp_report_template @mode,@screen,@name,'','',''`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const FetchGridTemplate = async (req, res) => {
  const { screen, name } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "GT")
      .input("screen", sql.VarChar, screen)
      .input("name", sql.VarChar, name)
      .query(`EXEC sp_report_template @mode,@screen,@name,'','',''`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const TemplateList = async (req, res) => {
  const { screen } = req.body;
  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();
    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "TL")
      .input("screen", sql.VarChar, screen)
      .query(`EXEC sp_report_template @mode,@screen,'','','',''`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

//Code added by pavun on 03-10-25
const logout = async (req, res) => {
  const { user_code } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "LOC")
      .input("user_code", sql.NVarChar, user_code)
      .query(`EXEC sp_user_info_hdr 'LOC','',@user_code,'','','','','','','','','','','','','','','','','','','','','','','',''`);

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Error", err.message);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
//Code ended by pavun on 03-10-25

//Code added by pavun on 04-10-25
const getLicenseDetails = async (req, res) => {
  try {
    const encryptedData = fs.readFileSync(LICENSE_FILE, "utf8");
    const decryptedData = aesGcmDecryptPayload(
      encryptedData,
      CONFIG_PASSPHRASE,
    );
    res.json(decryptedData);
  } catch (error) {
    res.status(500).json({ error: "Failed to load license file" });
  }
};
//Code ended by pavun on 04-10-25

//Code added by pavun on 07-10-25
const addSettings = async (req, res) => {
  const { company_code, Idle_time, created_by } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "I")
      .input("company_code", sql.NVarChar, company_code)
      .input("Idle_time", sql.Decimal(18, 2), Idle_time)
      .input("created_by", sql.NVarChar, created_by)
      .query(`EXEC sp_Settings @mode,@company_code,@Idle_time,@created_by,''`);

    res.status(200).json({ message: "Data inserted successfully" });
  } catch (err) {
    console.error("Error", err.message);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getSettings = async (req, res) => {
  const { company_code } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "S")
      .input("company_code", sql.NVarChar, company_code)
      .query(`EXEC sp_Settings @mode,@company_code,0,'',''`);

    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error", err.message);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getIdleTime = async (req, res) => {
  const { company_code } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "IT")
      .input("company_code", sql.NVarChar, company_code)
      .query(`EXEC sp_Settings @mode,@company_code,0,'',''`);

    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error", err.message);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
//Code ended by pavun on 07-10-25

const updateRoleRights = async (req, res) => {
  const {
    company_code,
    role_id,
    screen_type,
    permission_type,
    keyfield,
    modified_by,
  } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("company_code", sql.VarChar, company_code)
      .input("role_id", sql.VarChar, role_id)
      .input("screen_type", sql.NVarChar, screen_type)
      .input("permission_type", sql.VarChar, permission_type)
      .input("keyfield", sql.VarChar, keyfield)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(`EXEC sp_rolescreen_mapping @mode,@company_code, @role_id, @screen_type, @permission_type, @keyfield,'', @modified_by,  
               NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL`);
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

//Code added by pavun on 24-12-25
const LeaveMasterInsert = async (req, res) => {
  const {
    Leave_Code,
    Leave_Name,
    Leave_Description,
    Leave_Type,
    Accrual_Flag,
    Accrual_Frequency,
    Accrual_Start_Month,
    TotalDaysToBeCredit,
    Max_Accrual_Days,
    Carry_Forward_Flag,
    Max_Carry_Forward_Days,
    Carry_Forward_Expiry_Months,
    Min_Leave_Apply_Days,
    Max_Leave_Apply_Days,
    Allow_Half_Day,
    Allow_Negative_Balance,
    Leave_Reason_Required,
    Document_Required,
    Applicable_Gender,
    Applicable_Employee_Type,
    Min_Service_Months,
    Encashment_Allowed,
    Encashment_Max_Days,
    Weekend_Count,
    Holiday_Count,
    Is_Active,
    Is_Deleted,
    Display_Order,
    Effective_From,
    Effective_To,
    Company_Code,
    Country_Code,
    Region_Code,
    Record_Version,
    Row_GUID,
    Created_By,
  } = req.body;

  let pool;
  try {
    pool = await connection.connectToDatabase();

    await pool
      .request()
      .input("mode", sql.VarChar, "I")
      .input("Leave_Code", sql.VarChar, Leave_Code)
      .input("Leave_Name", sql.VarChar, Leave_Name)
      .input("Leave_Description", sql.VarChar, Leave_Description)
      .input("Leave_Type", sql.VarChar, Leave_Type)
      .input("Accrual_Flag", sql.Bit, Accrual_Flag)
      .input("Accrual_Frequency", sql.NVarChar, Accrual_Frequency)
      .input("Accrual_Start_Month", sql.Int, Accrual_Start_Month)
      .input("TotalDaysToBeCredit", sql.Decimal(18, 2), TotalDaysToBeCredit)
      .input("Max_Accrual_Days", sql.Decimal(18, 2), Max_Accrual_Days)
      .input("Carry_Forward_Flag", sql.Bit, Carry_Forward_Flag)
      .input(
        "Max_Carry_Forward_Days",
        sql.Decimal(18, 2),
        Max_Carry_Forward_Days,
      )
      .input(
        "Carry_Forward_Expiry_Months",
        sql.Int,
        Carry_Forward_Expiry_Months,
      )
      .input("Min_Leave_Apply_Days", sql.Decimal(18, 2), Min_Leave_Apply_Days)
      .input("Max_Leave_Apply_Days", sql.Decimal(18, 2), Max_Leave_Apply_Days)
      .input("Allow_Half_Day", sql.Bit, Allow_Half_Day)
      .input("Allow_Negative_Balance", sql.Bit, Allow_Negative_Balance)
      .input("Leave_Reason_Required", sql.Bit, Leave_Reason_Required)
      .input("Document_Required", sql.Bit, Document_Required)
      .input("Applicable_Gender", sql.VarChar, Applicable_Gender)
      .input("Applicable_Employee_Type", sql.VarChar, Applicable_Employee_Type)
      .input("Min_Service_Months", sql.Int, Min_Service_Months)
      .input("Encashment_Allowed", sql.Bit, Encashment_Allowed)
      .input("Encashment_Max_Days", sql.Int, Encashment_Max_Days)
      .input("Weekend_Count", sql.Int, Weekend_Count)
      .input("Holiday_Count", sql.Int, Holiday_Count)
      .input("Is_Active", sql.Bit, Is_Active)
      .input("Is_Deleted", sql.Bit, Is_Deleted)
      .input("Display_Order", sql.Int, Display_Order)
      .input("Effective_From", sql.DateTime, Effective_From)
      .input("Effective_To", sql.DateTime, Effective_To)
      .input("Company_Code", sql.NVarChar, Company_Code)
      .input("Country_Code", sql.VarChar, Country_Code)
      .input("Region_Code", sql.VarChar, Region_Code)
      .input("Record_Version", sql.Int, Record_Version)
      .input("Row_GUID", sql.NVarChar, Row_GUID)
      .input("Created_By", sql.VarChar, Created_By)
      .query(`EXEC sp_Leave_Master @mode,@Leave_Code,@Leave_Name,@Leave_Description,@Leave_Type,@Accrual_Flag,@Accrual_Frequency,
        @Accrual_Start_Month,@TotalDaysToBeCredit,@Max_Accrual_Days,@Carry_Forward_Flag,@Max_Carry_Forward_Days,@Carry_Forward_Expiry_Months,
        @Min_Leave_Apply_Days,@Max_Leave_Apply_Days,@Allow_Half_Day,@Allow_Negative_Balance,@Leave_Reason_Required,@Document_Required,
        @Applicable_Gender,@Applicable_Employee_Type,@Min_Service_Months,@Encashment_Allowed,@Encashment_Max_Days,@Weekend_Count,@Holiday_Count,
        @Is_Active,@Is_Deleted,@Display_Order,@Effective_From,@Effective_To,@Company_Code,@Country_Code,@Region_Code,@Record_Version,
        @Row_GUID,'',@Created_By,NULL,NULL,NULL`);

    res.status(200).json("Leave Master inserted successfully");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const LeaveMasterUpdate = async (req, res) => {
  const {
    Leave_Code,
    Leave_Name,
    Leave_Description,
    Leave_Type,
    Accrual_Flag,
    Accrual_Frequency,
    Accrual_Start_Month,
    TotalDaysToBeCredit,
    Max_Accrual_Days,
    Carry_Forward_Flag,
    Max_Carry_Forward_Days,
    Carry_Forward_Expiry_Months,
    Min_Leave_Apply_Days,
    Max_Leave_Apply_Days,
    Allow_Half_Day,
    Allow_Negative_Balance,
    Leave_Reason_Required,
    Document_Required,
    Applicable_Gender,
    Applicable_Employee_Type,
    Min_Service_Months,
    Encashment_Allowed,
    Encashment_Max_Days,
    Weekend_Count,
    Holiday_Count,
    Is_Active,
    Is_Deleted,
    Display_Order,
    Effective_From,
    Effective_To,
    Company_Code,
    Country_Code,
    Region_Code,
    Record_Version,
    Row_GUID,
    Keyfield,
    Modified_By,
  } = req.body;

  let pool;
  try {
    pool = await connection.connectToDatabase();

    await pool
      .request()
      .input("mode", sql.VarChar, "U")
      .input("Leave_Code", sql.VarChar, Leave_Code)
      .input("Leave_Name", sql.VarChar, Leave_Name)
      .input("Leave_Description", sql.VarChar, Leave_Description)
      .input("Leave_Type", sql.VarChar, Leave_Type)
      .input("Accrual_Flag", sql.Bit, Accrual_Flag)
      .input("Accrual_Frequency", sql.NVarChar, Accrual_Frequency)
      .input("Accrual_Start_Month", sql.Int, Accrual_Start_Month)
      .input("TotalDaysToBeCredit", sql.Decimal(18, 2), TotalDaysToBeCredit)
      .input("Max_Accrual_Days", sql.Decimal(18, 2), Max_Accrual_Days)
      .input("Carry_Forward_Flag", sql.Bit, Carry_Forward_Flag)
      .input(
        "Max_Carry_Forward_Days",
        sql.Decimal(18, 2),
        Max_Carry_Forward_Days,
      )
      .input(
        "Carry_Forward_Expiry_Months",
        sql.Int,
        Carry_Forward_Expiry_Months,
      )
      .input("Min_Leave_Apply_Days", sql.Decimal(18, 2), Min_Leave_Apply_Days)
      .input("Max_Leave_Apply_Days", sql.Decimal(18, 2), Max_Leave_Apply_Days)
      .input("Allow_Half_Day", sql.Bit, Allow_Half_Day)
      .input("Allow_Negative_Balance", sql.Bit, Allow_Negative_Balance)
      .input("Leave_Reason_Required", sql.Bit, Leave_Reason_Required)
      .input("Document_Required", sql.Bit, Document_Required)
      .input("Applicable_Gender", sql.VarChar, Applicable_Gender)
      .input("Applicable_Employee_Type", sql.VarChar, Applicable_Employee_Type)
      .input("Min_Service_Months", sql.Int, Min_Service_Months)
      .input("Encashment_Allowed", sql.Bit, Encashment_Allowed)
      .input("Encashment_Max_Days", sql.Int, Encashment_Max_Days)
      .input("Weekend_Count", sql.Int, Weekend_Count)
      .input("Holiday_Count", sql.Int, Holiday_Count)
      .input("Is_Active", sql.Bit, Is_Active)
      .input("Is_Deleted", sql.Bit, Is_Deleted)
      .input("Display_Order", sql.Int, Display_Order)
      .input("Effective_From", sql.DateTime, Effective_From)
      .input("Effective_To", sql.DateTime, Effective_To)
      .input("Company_Code", sql.NVarChar, Company_Code)
      .input("Country_Code", sql.VarChar, Country_Code)
      .input("Region_Code", sql.VarChar, Region_Code)
      .input("Record_Version", sql.Int, Record_Version)
      .input("Row_GUID", sql.NVarChar, Row_GUID)
      .input("Keyfield", sql.NVarChar, Keyfield)
      .input("Modified_By", sql.VarChar, Modified_By)
      .query(`EXEC sp_Leave_Master @mode,@Leave_Code,@Leave_Name,@Leave_Description,@Leave_Type,@Accrual_Flag,@Accrual_Frequency,
        @Accrual_Start_Month,@TotalDaysToBeCredit,@Max_Accrual_Days,@Carry_Forward_Flag,@Max_Carry_Forward_Days,@Carry_Forward_Expiry_Months,
        @Min_Leave_Apply_Days,@Max_Leave_Apply_Days,@Allow_Half_Day,@Allow_Negative_Balance,@Leave_Reason_Required,@Document_Required,
        @Applicable_Gender,@Applicable_Employee_Type,@Min_Service_Months,@Encashment_Allowed,@Encashment_Max_Days,@Weekend_Count,@Holiday_Count,
        @Is_Active,@Is_Deleted,@Display_Order,@Effective_From,@Effective_To,@Company_Code,@Country_Code,@Region_Code,@Record_Version,
        @Row_GUID,@Keyfield,NULL,NULL,@Modified_By,NULL`);

    res.status(200).json("Leave Master updated successfully");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const LeaveMasterSearch = async (req, res) => {
  const {
    Leave_Code,
    Leave_Name,
    Leave_Description,
    Min_Leave_Apply_Days,
    Max_Leave_Apply_Days,
    Is_Active,
    Effective_From,
    Effective_To,
    Company_Code,
  } = req.body;

  let pool;
  try {
    pool = await connection.connectToDatabase();

    const result = await pool
      .request()
      .input("mode", sql.VarChar, "SC")
      .input("Leave_Code", sql.VarChar, Leave_Code)
      .input("Leave_Name", sql.VarChar, Leave_Name)
      .input("Leave_Description", sql.VarChar, Leave_Description)
      .input("Min_Leave_Apply_Days", sql.Decimal(18, 2), Min_Leave_Apply_Days)
      .input("Max_Leave_Apply_Days", sql.Decimal(18, 2), Max_Leave_Apply_Days)
      .input("Is_Active", sql.Bit, Is_Active)
      .input("Effective_From", sql.NVarChar, Effective_From)
      .input("Effective_To", sql.NVarChar, Effective_To)
      .input("Company_Code", sql.NVarChar, Company_Code)
      .query(`EXEC sp_Leave_Master @mode,@Leave_Code,@Leave_Name,@Leave_Description,'',0,0,
        0,0,0,0,0,0,@Min_Leave_Apply_Days,@Max_Leave_Apply_Days,0,0,0,0,'','',0,0,0,0,0,
        @Is_Active,0,'',@Effective_From,@Effective_To,@Company_Code,'','','','','',NULL,NULL,NULL,NULL`);

    if (
      result.recordsets &&
      result.recordsets.length > 0 &&
      result.recordsets[0].length > 0
    ) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const LeaveMasterGridUpdate = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    return res.status(400).json("Invalid or empty editedData array.");
  }

  let pool;
  try {
    pool = await connection.connectToDatabase();

    for (const updatedRow of editedData) {
      const effectiveFrom =
        updatedRow.Effective_From && updatedRow.Effective_From !== ""
          ? new Date(updatedRow.Effective_From.split("-").reverse().join("-"))
          : null;

      const effectiveTo =
        updatedRow.Effective_To && updatedRow.Effective_To !== ""
          ? new Date(updatedRow.Effective_To.split("-").reverse().join("-"))
          : null;

      const isActiveBit = updatedRow.Is_Active === true ? 1 : 0;

      await pool
        .request()
        .input("mode", sql.VarChar(1), "U")
        .input("Leave_Code", sql.VarChar, updatedRow.Leave_Code)
        .input("Leave_Name", sql.VarChar, updatedRow.Leave_Name)
        .input("Leave_Description", sql.VarChar, updatedRow.Leave_Description)
        .input(
          "Min_Leave_Apply_Days",
          sql.Decimal(18, 2),
          updatedRow.Min_Leave_Apply_Days,
        )
        .input(
          "Max_Leave_Apply_Days",
          sql.Decimal(18, 2),
          updatedRow.Max_Leave_Apply_Days,
        )
        .input("Is_Active", sql.Bit, isActiveBit)
        .input("Effective_From", sql.DateTime, effectiveFrom) // ✅ FIXED
        .input("Effective_To", sql.DateTime, effectiveTo) // ✅ FIXED
        .input("Keyfield", sql.VarChar, updatedRow.Keyfield)
        .input("Company_Code", sql.NVarChar, req.headers["company_code"])
        .input("Modified_By", sql.NVarChar, req.headers["modified_by"]).query(`
          EXEC sp_Leave_Master @mode,@Leave_Code,@Leave_Name,@Leave_Description,'',0,0,
          0,0,0,0,0,0,@Min_Leave_Apply_Days,@Max_Leave_Apply_Days,
          0,0,0,0,'','',0,0,0,0,0,@Is_Active,0,'',@Effective_From,@Effective_To,
          @Company_Code,'','','','',@Keyfield,NULL,NULL,@Modified_By,NULL`);
    }

    res.status(200).json("Leave Master updated successfully");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const LeaveMasterGridDelete = async (req, res) => {
  const deletedData = req.body.deletedData;

  if (!deletedData || !deletedData.length) {
    return res.status(400).json("Invalid or empty editedData array.");
  }

  let pool;
  try {
    pool = await connection.connectToDatabase();

    for (const Keyfield of deletedData) {
      await pool
        .request()
        .input("mode", sql.VarChar(1), "D")
        .input("Keyfield", sql.VarChar, Keyfield)
        .input("Company_Code", sql.NVarChar, req.headers["company_code"])
        .query(`
          EXEC sp_Leave_Master @mode,'','','','',0,0,0,0,0,0,0,0,0,0,0,0,0,0,'','',0,0,0,0,0,0,0,'','','',
          @Company_Code,'','','','',@Keyfield,NULL,NULL,NULL,NULL`);
    }

    res.status(200).json("Leave Master updated successfully");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

//Code ended by pavun on 24-12-25

//Code added by pavun on 02-02-26
const getEmployeeDelete = async (req, res) => {
  const valueToDelete = req.body.valueToDelete;

  if (!valueToDelete || !valueToDelete.length) {
    res.status(400).json("Invalid or emptykeyfields array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();
    for (const value of valueToDelete) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "EDL")
        .input("value", sql.NVarChar, value)
        .query(`EXEC sp_employee_master @mode,'','',@value`);

      res.status(200).json({
        success: true,
        message: "Employee deleted successfully",
      });
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};
//Code ended by pavun on 02-02-26

//Code added by pavun on 04-02-26
const getCompanyno = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      `EXEC sp_company_info 'F','', ' ', '', '', '', '', '',  '', '' , '', '', '','',  '','','','','',null,NULL, NULL,NULL,NULL,NULL,NULL,NULL,NULL,null,null,null`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getsearchdata = async (req, res) => {
  const {
    company_no,
    company_name,
    city,
    state,
    pincode,
    country,
    status,
    company_gst_no,
  } = req.body;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_no", sql.NVarChar, company_no)
      .input("company_name", sql.NVarChar, company_name)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("company_gst_no", sql.NVarChar, company_gst_no)
      .input("status", sql.NVarChar, status)
      .query(
        ` EXEC sp_company_info @mode,@company_no,@company_name,'','','','',@city,@state,@pincode,@country,@company_gst_no,@status,'','','','','','','','','','','','','','','','','','' `,
      );
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json("Data not found");
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const addData = async (req, res) => {
  const {
    company_no,
    company_name,
    short_name,
    address1,
    address2,
    address3,
    city,
    state,
    pincode,
    country,
    email_id,
    status,
    foundedDate,
    websiteURL,
    contact_no,
    annualReportURL,
    location_no,
    company_gst_no,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;

  let company_logo = null;
  let authorisedSignatur = null;
  let safeFoundedDate = null;

  if (req.files && req.files.company_logo) {
    company_logo = req.files.company_logo[0].buffer;
  }

  if (req.files && req.files.authorisedSignatur) {
    authorisedSignatur = req.files.authorisedSignatur[0].buffer;
  }

  if (foundedDate && foundedDate !== "null" && foundedDate !== "") {
    safeFoundedDate = foundedDate;
  }

  try {
    pool = await sql.connect(dbConfig);

    // If the company code doesn't exist, proceed with inserting the data
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_no", sql.NVarChar, company_no)
      .input("company_name", sql.NVarChar, company_name)
      .input("short_name", sql.NVarChar, short_name)
      .input("address1", sql.NVarChar, address1)
      .input("address2", sql.NVarChar, address2)
      .input("address3", sql.NVarChar, address3)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("email_id", sql.NVarChar, email_id)
      .input("status", sql.NVarChar, status)
      .input("foundedDate", sql.DateTime, safeFoundedDate)
      .input("websiteURL", sql.NVarChar, websiteURL)
      .input("company_logo", sql.VarBinary, company_logo)
      .input("contact_no", sql.NVarChar, contact_no)
      .input("annualReportURL", sql.NVarChar, annualReportURL)
      .input("location_no", sql.NVarChar, location_no)
      .input("company_gst_no", sql.NVarChar, company_gst_no)
      .input("authorisedSignatur", sql.VarBinary, authorisedSignatur)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_company_info @mode, @company_no, @company_name, @short_name, @address1, @address2, @address3, @city, @state, @pincode, @country, @email_id, 
        @status, @foundedDate, @websiteURL, @company_logo, @contact_no, @annualReportURL,@location_no,@company_gst_no,@authorisedSignatur,@created_by,@modified_by,  
         @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
        @datetime1, @datetime2, @datetime3, @datetime4`,
      );

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const saveEditedData = async (req, res) => {
  const editedData = req.body.editedData;
  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }
  try {
    const pool = await connection.connectToDatabase();
    for (const updatedRow of editedData) {
      const company_logo =
        updatedRow.company_logo && updatedRow.company_logo.type === "Buffer"
          ? Buffer.from(updatedRow.company_logo.data)
          : null;

      const authorisedSignatur =
        updatedRow.authorisedSignatur &&
        updatedRow.authorisedSignatur.type === "Buffer"
          ? Buffer.from(updatedRow.authorisedSignatur.data)
          : null;

      const foundedDate =
        updatedRow.foundedDate && updatedRow.foundedDate !== ""
          ? new Date(updatedRow.foundedDate.split("-").reverse().join("-"))
          : null;
       console.log(company_logo);
      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("company_no", updatedRow.company_no)
        .input("company_name", updatedRow.company_name)
        .input("short_name", updatedRow.short_name)
        .input("address1", updatedRow.address1)
        .input("address2", updatedRow.address2)
        .input("address3", updatedRow.address3)
        .input("city", updatedRow.city)
        .input("state", updatedRow.state)
        .input("pincode", updatedRow.pincode)
        .input("country", updatedRow.country)
        .input("email_id", updatedRow.email_id)
        .input("status", updatedRow.status)
        .input("foundedDate", sql.DateTime, foundedDate)
        .input("websiteURL", updatedRow.websiteURL)
        .input("company_logo", sql.VarBinary, company_logo)
        .input("contact_no", updatedRow.contact_no)
        .input("annualReportURL", updatedRow.annualReportURL)
        .input("location_no", updatedRow.location_no)
        .input("company_gst_no", updatedRow.company_gst_no)
        .input("authorisedSignatur", sql.VarBinary, authorisedSignatur)
        .input("created_by", updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", updatedRow.tempstr1)
        .input("tempstr2", updatedRow.tempstr2)
        .input("tempstr3", updatedRow.tempstr3)
        .input("tempstr4", updatedRow.tempstr4)
        .input("datetime1", updatedRow.datetime1)
        .input("datetime2", updatedRow.datetime2)
        .input("datetime3", updatedRow.datetime3)
        .input("datetime4", updatedRow.datetime4)
        .query(`EXEC sp_company_info @mode, @company_no, @company_name, @short_name, @address1, @address2, @address3, @city, @state, @pincode, @country, @email_id,
          @status, @foundedDate, @websiteURL,@company_logo,@contact_no,@annualReportURL,@location_no,@company_gst_no,@authorisedSignatur,@created_by,@modified_by,
           @tempstr1, @tempstr2, @tempstr3, @tempstr4,
          @datetime1, @datetime2, @datetime3, @datetime4`);
    }
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const deleteData = async (req, res) => {
  const company_nosToDelete = req.body.company_nos;

  if (!company_nosToDelete || !company_nosToDelete.length) {
    res.status(400).json("Invalid or empty company_nos array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const company_no of company_nosToDelete) {
      await pool
        .request()
        .input("company_no", company_no)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"]).query(`
          EXEC sp_company_info 'D', @company_no,'','','','','','','','',
          '','','','','','','','',
          '','','','',@modified_by,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
        `);
    }

    res.status(200).json("Companies deleted successfully");
  } catch (err) {
    console.error("Error during update:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAllCompanyMappingData = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result =
      await sql.query(`EXEC sp_user_company_mapping 'I','','','','','',0,'','','',
      NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const CompanyUpdate = async (req, res) => {
  const {
    company_no,
    company_name,
    short_name,
    address1,
    address2,
    address3,
    city,
    state,
    pincode,
    country,
    email_id,
    status,
    foundedDate,
    websiteURL,
    contact_no,
    annualReportURL,
    location_no,
    company_gst_no,
    modified_by,
  } = req.body;

  let company_logo = null;
  let authorisedSignatur = null;
  let safeFoundedDate = null;

  if (req.files && req.files.company_logo) {
    company_logo = req.files.company_logo[0].buffer;
  }

  if (req.files && req.files.authorisedSignatur) {
    authorisedSignatur = req.files.authorisedSignatur[0].buffer;
  }

  if (foundedDate && foundedDate !== "null" && foundedDate !== "") {
    safeFoundedDate = foundedDate;
  }

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("company_no", sql.NVarChar, company_no)
      .input("company_name", sql.NVarChar, company_name)
      .input("short_name", sql.NVarChar, short_name)
      .input("address1", sql.NVarChar, address1)
      .input("address2", sql.NVarChar, address2)
      .input("address3", sql.NVarChar, address3)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("email_id", sql.NVarChar, email_id)
      .input("status", sql.NVarChar, status)
      .input("foundedDate", sql.DateTime, safeFoundedDate)
      .input("websiteURL", sql.NVarChar, websiteURL)
      .input("company_logo", sql.VarBinary, company_logo)
      .input("contact_no", sql.NVarChar, contact_no)
      .input("annualReportURL", sql.NVarChar, annualReportURL)
      .input("location_no", sql.NVarChar, location_no)
      .input("company_gst_no", sql.NVarChar, company_gst_no)
      .input("authorisedSignatur", sql.VarBinary, authorisedSignatur)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(`EXEC sp_company_info @mode, @company_no, @company_name, @short_name, @address1, @address2, @address3, @city, @state, @pincode, @country, @email_id, 
        @status, @foundedDate, @websiteURL, @company_logo, @contact_no, @annualReportURL,@location_no,@company_gst_no,@authorisedSignatur,'' ,@modified_by,
         '', '', '', '','', '', '', ''`);
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const addCompanyMappingData = async (req, res) => {
  const {
    company_code,
    user_code,
    company_no,
    location_no,
    status,
    order_no,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.VarChar, user_code)
      .input("company_no", sql.NVarChar, company_no)
      .input("location_no", sql.VarChar, location_no)
      .input("status", sql.VarChar, status)
      .input("order_no", sql.Int, order_no)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_user_company_mapping @mode,@company_code,@user_code,@company_no,@location_no,@status,@order_no,'',@created_by,@modified_by,
        @tempstr1,@tempstr2,@tempstr3,@tempstr4,@datetime1,@datetime2,@datetime3,@datetime4`,
      );

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const CompanyMappingUpdate = async (req, res) => {
  const {
    company_code,
    user_code,
    company_no,
    location_no,
    status,
    order_no,
    keyfiels,
    modified_by,
  } = req.body;
  let pool;
  try {
    pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.VarChar, user_code)
      .input("company_no", sql.NVarChar, company_no)
      .input("location_no", sql.VarChar, location_no)
      .input("status", sql.VarChar, status)
      .input("order_no", sql.Int, order_no)
      .input("keyfiels", sql.NVarChar, keyfiels)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(`EXEC sp_user_company_mapping @mode, @company_code, @user_code, @company_no, @location_no, 
          @status, @order_no,@keyfiels,'',@modified_by,'', '', '', '', '', '', '', ''`);
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const commappingdeleteData = async (req, res) => {
  const keyfielsToDelete = req.body.keyfiels;

  try {
    const pool = await connection.connectToDatabase();

    for (const keyfiels of keyfielsToDelete) {
      await pool
        .request()
        .input("keyfiels", keyfiels)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .query(`EXEC sp_user_company_mapping 'D','','','','001','',0,@keyfiels,'','',
           NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`);
    }

    res.status(200).json("User and company mapping data deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
};

const updcompanymapping = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase(dbConfig);

    for (const updatedRow of editedData) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("user_code", updatedRow.user_code)
        .input("company_no", updatedRow.company_no)
        .input("location_no", updatedRow.location_no)
        .input("status", updatedRow.status)
        .input("order_no", updatedRow.order_no)
        .input("keyfiels", updatedRow.keyfiels)
        .input("created_by", updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", updatedRow.tempstr1)
        .input("tempstr2", updatedRow.tempstr2)
        .input("tempstr3", updatedRow.tempstr3)
        .input("tempstr4", updatedRow.tempstr4)
        .input("datetime1", updatedRow.datetime1)
        .input("datetime2", updatedRow.datetime2)
        .input("datetime3", updatedRow.datetime3)
        .input("datetime4", updatedRow.datetime4)
        .query(`EXEC sp_user_company_mapping @mode, @company_code, @user_code, @company_no, @location_no, 
                                @status, @order_no,@keyfiels,@created_by,@modified_by,
                               @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
                              @datetime1, @datetime2, @datetime3, @datetime4`);
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getusercompany = async (req, res) => {
  const { user_code } = req.body;
  let pool;
  try {
    const pool = await connection.connectToDatabase();
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "UCL") // Insert mode
      .input("user_code", sql.NVarChar, user_code)
      .query(
        `EXEC sp_user_company_mapping @mode,'',@user_code,'','','',0,'','','',
                              NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getcompanymappingsearchdata = async (req, res) => {
  const { company_code, user_code, company_no, location_no, status } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.NVarChar, user_code)
      .input("company_no", sql.NVarChar, company_no)
      .input("location_no", sql.NVarChar, location_no)
      .input("status", sql.NVarChar, status)

      .query(
        `EXEC sp_user_company_mapping @mode,@company_code,@user_code,@company_no,@location_no,@status,0,'','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
      );

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const getLocationno = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      "EXEC sp_location_info 'F','', '', '', '', '', '', '','', '', '', '', '',  0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL",
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getlocationsearchdata = async (req, res) => {
  const {
    company_code,
    location_no,
    location_name,
    city,
    state,
    pincode,
    country,
    status,
  } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("location_no", sql.NVarChar, location_no)
      .input("location_name", sql.NVarChar, location_name)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("status", sql.NVarChar, status)
      .query(` EXEC sp_location_info @mode,@location_no,@location_name, '', '', '', '', @city,@state, @pincode, @country, '', 
        @status, '', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL `);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const addlocationinfo = async (req, res) => {
  const {
    location_no,
    location_name,
    short_name,
    address1,
    address2,
    address3,
    city,
    state,
    pincode,
    country,
    email_id,
    status,
    contact_no,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;

  let pool;
  try {
    pool = await sql.connect(dbConfig);

    // If the company code doesn't exist, proceed with inserting the data
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("location_no", sql.NVarChar, location_no)
      .input("location_name", sql.NVarChar, location_name)
      .input("short_name", sql.NVarChar, short_name)
      .input("address1", sql.NVarChar, address1)
      .input("address2", sql.NVarChar, address2)
      .input("address3", sql.NVarChar, address3)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("email_id", sql.NVarChar, email_id)
      .input("status", sql.NVarChar, status)
      .input("contact_no", sql.NVarChar, contact_no)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_location_info @mode,@location_no, @location_name, @short_name, @address1, @address2, @address3, @city, @state, @pincode, @country, @email_id, 
      @status,  @contact_no, @created_by,@modified_by,
       @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
      @datetime1, @datetime2, @datetime3, @datetime4`,
      );

    // Return success response
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Data inserted successfully" });
    }
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const locationsaveEditedData = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const updatedRow of editedData) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("location_no", updatedRow.location_no)
        .input("location_name", updatedRow.location_name)
        .input("short_name", updatedRow.short_name)
        .input("address1", updatedRow.address1)
        .input("address2", updatedRow.address2)
        .input("address3", updatedRow.address3)
        .input("city", updatedRow.city)
        .input("state", updatedRow.state)
        .input("pincode", updatedRow.pincode)
        .input("country", updatedRow.country)
        .input("email_id", updatedRow.email_id)
        .input("status", updatedRow.status)
        .input("contact_no", updatedRow.contact_no)
        .input("created_by", updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", updatedRow.tempstr1)
        .input("tempstr2", updatedRow.tempstr2)
        .input("tempstr3", updatedRow.tempstr3)
        .input("tempstr4", updatedRow.tempstr4)
        .input("datetime1", updatedRow.datetime1)
        .input("datetime2", updatedRow.datetime2)
        .input("datetime3", updatedRow.datetime3)
        .input("datetime4", updatedRow.datetime4)
        .query(`EXEC sp_location_info @mode,@location_no, @location_name, @short_name, @address1, @address2, 
          @address3, @city, @state, @pincode, @country, @email_id,  @status, @contact_no, @created_by, @modified_by , 
         @tempstr1, @tempstr2, @tempstr3, @tempstr4, 
        @datetime1, @datetime2, @datetime3, @datetime4`);
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const locationdeleteData = async (req, res) => {
  const location_nosToDelete = req.body.location_nos;

  if (!location_nosToDelete || !location_nosToDelete.length) {
    res.status(400).json("Invalid or empty location no's array.");
    return;
  }

  try {
    const pool = await connection.connectToDatabase();

    for (const location_no of location_nosToDelete) {
      await pool
        .request()
        .input("location_no", location_no)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .query(`EXEC sp_location_info 'D',@location_no, '', '', '', '', '', 
          '', '', '', '', '','',  '', '',@modified_by,NULL, NULL, NULL, NULL,NULL, NULL, NULL, NULL`);
    }

    res.status(200).json("location deleted successfully");
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const LocationUpdate = async (req, res) => {
  const {
    location_no,
    location_name,
    short_name,
    address1,
    address2,
    address3,
    city,
    state,
    pincode,
    country,
    email_id,
    status,
    contact_no,
    created_by,
    modified_by,
  } = req.body;

  let pool;
  try {
    pool = await connection.connectToDatabase();

    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("location_no", sql.NVarChar, location_no)
      .input("location_name", sql.NVarChar, location_name)
      .input("short_name", sql.NVarChar, short_name)
      .input("address1", sql.NVarChar, address1)
      .input("address2", sql.NVarChar, address2)
      .input("address3", sql.NVarChar, address3)
      .input("city", sql.NVarChar, city)
      .input("state", sql.NVarChar, state)
      .input("pincode", sql.NVarChar, pincode)
      .input("country", sql.NVarChar, country)
      .input("email_id", sql.NVarChar, email_id)
      .input("status", sql.NVarChar, status)
      .input("contact_no", sql.NVarChar, contact_no)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .query(`EXEC sp_location_info @mode,@location_no, @location_name, @short_name, @address1, @address2, 
          @address3, @city, @state, @pincode, @country, @email_id,  @status, @contact_no, @created_by, @modified_by , 
         '', '', '', '','', '', '',''`);
    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const RoleMappingUpdate = async (req, res) => {
  const { company_code, user_code, role_id, keyfield, modified_by } = req.body;

  try {
    const pool = await connection.connectToDatabase();
    await pool
      .request()
      .input("mode", sql.NVarChar, "U")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.VarChar, user_code)
      .input("role_id", sql.VarChar, role_id)
      .input("keyfield", sql.VarChar, keyfield)
      .input("modified_by", sql.VarChar, modified_by)
      .query(
        `EXEC sp_user_rolemapping @mode,@company_code,@user_code,'',@role_id,'',@keyfield,'',@modified_by,'','','','','','','',''`,
      );

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const updateRoleMapping = async (req, res) => {
  const editedData = req.body.editedData;

  if (!editedData || !editedData.length) {
    res.status(400).json("Invalid or empty editedData array.");
    return;
  }
  try {
    const pool = await connection.connectToDatabase(dbConfig);

    for (const updatedRow of editedData) {
      await pool
        .request()
        .input("mode", sql.NVarChar, "U")
        .input("company_code", sql.NVarChar, req.headers["company_code"])
        .input("user_code", updatedRow.user_code)
        .input("role_id", updatedRow.role_id)
        .input("keyfield", updatedRow.keyfield)
        .input("created_by", updatedRow.created_by)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .input("tempstr1", updatedRow.tempstr1)
        .input("tempstr2", updatedRow.tempstr2)
        .input("tempstr3", updatedRow.tempstr3)
        .input("tempstr4", updatedRow.tempstr4)
        .input("datetime1", updatedRow.datetime1)
        .input("datetime2", updatedRow.datetime2)
        .input("datetime3", updatedRow.datetime3)
        .input("datetime4", updatedRow.datetime4)
        .query(
          `EXEC sp_user_rolemapping @mode,@company_code,@user_code,'',@role_id,'',@keyfield,@created_by,@modified_by,@tempstr1,@tempstr2,@tempstr3,@tempstr4,@datetime1,@datetime2,@datetime3,@datetime4`,
        );
    }

    res.status(200).json("Edited data saved successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const RollMappingDelete = async (req, res) => {
  const keyfieldToDelete = req.body.keyfield;

  try {
    const pool = await connection.connectToDatabase();
    for (const keyfield of keyfieldToDelete) {
      await pool
        .request()
        .input("keyfield", keyfield)
        .input("modified_by", sql.NVarChar, req.headers["modified-by"])
        .query(
          ` EXEC sp_user_rolemapping 'D','','','','','',@keyfield,'', @modified_by,null,null,null,null,null,null,null,null`,
        );
    }
    res.status(200).json("RoleMapping Deleted Successfully");
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getUserrolesearchdata = async (req, res) => {
  const { company_code, user_code, user_name, role_id, role_name } = req.body;

  try {
    // Connect to the database
    const pool = await connection.connectToDatabase();

    // Execute the query
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "SC")
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.NVarChar, user_code)
      .input("user_name", sql.NVarChar, user_name)
      .input("role_id", sql.NVarChar, role_id)
      .input("role_name", sql.NVarChar, role_name)
      .query(`EXEC sp_user_rolemapping @mode,@company_code,@user_code,@user_name,@role_id,@role_name,'','','',
      null,null,null,null,null,null,null,null `);

    // Send response
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset); // 200 OK if data is found
    } else {
      res.status(404).json("Data not found"); // 404 Not Found if no data is found
    }
  } catch (err) {
    console.error("Error", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
};

const addUserRoleMappingData = async (req, res) => {
  const {
    company_code,
    user_code,
    role_id,
    created_by,
    modified_by,
    tempstr1,
    tempstr2,
    tempstr3,
    tempstr4,
    datetime1,
    datetime2,
    datetime3,
    datetime4,
  } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("mode", sql.NVarChar, "I") // Insert mode
      .input("company_code", sql.NVarChar, company_code)
      .input("user_code", sql.VarChar, user_code)
      .input("role_id", sql.NVarChar, role_id)
      .input("created_by", sql.NVarChar, created_by)
      .input("modified_by", sql.NVarChar, modified_by)
      .input("tempstr1", sql.NVarChar, tempstr1)
      .input("tempstr2", sql.NVarChar, tempstr2)
      .input("tempstr3", sql.NVarChar, tempstr3)
      .input("tempstr4", sql.NVarChar, tempstr4)
      .input("datetime1", sql.NVarChar, datetime1)
      .input("datetime2", sql.NVarChar, datetime2)
      .input("datetime3", sql.NVarChar, datetime3)
      .input("datetime4", sql.NVarChar, datetime4)
      .query(
        `EXEC sp_user_rolemapping @mode,@company_code, @user_code,'',@role_id,'','',@created_by,@modified_by,
        @tempstr1,@tempstr2,@tempstr3,@tempstr4,@datetime1,@datetime2,@datetime3,@datetime4`,
      );

    res.json({ success: true, message: "Data inserted successfully" });
  } catch (err) {
    if (err.class === 16 && err.number === 50000) {
      // Custom error from the stored procedure
      res.status(400).json({ message: "User & Role already exists" });
    } else {
      // Handle unexpected errors
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  }
};

const getAllUserRoleMappingData = async (req, res) => {
  try {
    await connection.connectToDatabase();
    const result = await sql.query(
      `EXEC sp_user_rolemapping 'A','','','','','','','','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`,
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

//Code ended by pavun on 04-02-26

module.exports = {
  getLocationno,
  getlocationsearchdata,
  addlocationinfo,
  locationsaveEditedData,
  locationdeleteData,
  LocationUpdate,
  forgetPassword,
  Passwords,
  login,
  getAlluserData,
  userAddData,
  UsersaveEditedData,
  UserdeleteData,
  getUsersearchdata,
  UpdateUserImage,
  UserUpdate,
  Userdropdown,
  getAllCompanyMappingData,
  addCompanyMappingData,
  addattrihdrData,
  RoleUpdate,
  getUserRole,
  roledeleteData,
  getRolesearchdata,
  RolesaveEditedData,
  AddRoleInfoData,
  getAllRoleInfoData,
  getroleid,
  getUserPermission,
  getuserscreensearchdata,
  userscreenmapdeleteData,
  saveEditeduserscreenmap,
  adduserscreenmap,
  getAlluserscreenmap,
  RoleMappingUpdate,
  updateRoleMapping,
  RollMappingDelete,
  getUserrolesearchdata,
  addUserRoleMappingData,
  getAllUserRoleMappingData,
  CompanyMappingUpdate,
  updcompanymapping,
  commappingdeleteData,
  getusercompany,
  getcompanymappingsearchdata,
  getvariant,
  getuom,
  getCity,
  getCountry,
  getState,
  getStatus,
  getShift,
  getTransaction,
  getGender,
  getLoginorout,
  getDeletepermission,
  getregisterbrand,
  getourbrand,
  gethdrcode,
  getUsertype,
  getscreentype,
  getPaytype,
  getPurchasetype,
  getSalestype,
  getordertype,
  getAllattributedetData,
  addattridetData,
  deleteAttriDetailData,
  updattridetData,
  getattributeSearchdata,
  gettranstype,
  getScreens,
  getPermissions,
  getacctype,
  getofftype,
  getInventoryTransaction,
  getEmptype,
  getCondition,
  AttributeUpdate,
  getEvent,
  getsiblings,
  getkids,
  getMartial,
  getSalaryType,
  getPayscale,
  getLoanID,
  getItem,
  getDocumentType,
  getrelation,
  getAnnouncementDetail,
  getannoncementtype,
  getAnnouncement_Msg,
  getAnnouncement,
  getcompanyshift,
  getOverallTAX,
  getAnnouncementDuration,
  getPriority,
  PendingCustomer,
  getTaskstatus,
  getPurchaseAnalysis,
  getSalesMode,
  getdefCustomer,
  getPendingStatus,
  getLeaveReason,
  getExceedLeave,
  getAccrual,
  getType,
  getGSTReport,
  getPartyName,
  getGST,
  getDashBoardType,
  getSelectSlot,
  getLeaveType,
  getInvocieType,
  getUsercode,
  Fame_atten_report,
  getDeptType_Daily_Atte_Report,
  getDeptType_Atte_Report,
  Fame_atten_contract,
  getcontractorname,
  fame_emp_details,
  Fame_atten_machine_log_report,
  getColumn,
  getEmployeeBasicDetails,
  getEmployeesearchcriteria,
  GetCompanyCode,
  GetDeptCode,
  GetemployeeFullDetails,
  TemplateInsert,
  FetchTemplate,
  FetchGridTemplate,
  TemplateList,
  logout,
  getLicenseDetails,
  addSettings,
  getSettings,
  getIdleTime,
  updateRoleRights,
  LeaveMasterInsert,
  LeaveMasterUpdate,
  LeaveMasterSearch,
  LeaveMasterGridUpdate,
  LeaveMasterGridDelete,
  getEmployeeDelete,
  getCompanyno,
  getsearchdata,
  addData,
  saveEditedData,
  deleteData,
  CompanyUpdate,
};
