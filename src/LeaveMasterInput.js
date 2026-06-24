import { useState, useEffect } from "react";
import "./input.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation } from "react-router-dom";
import config from "./Apiconfig";
import LoadingScreen from "./LoadingScreen";

function LeaveMasterInput({}) {
  const [leaveCode, setLeaveCode] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [minLeaveApplyDays, setMinLeaveApplyDays] = useState("");
  const [status, setStatus] = useState(null);
  const [statusdrop, setStatusdrop] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [maxLeaveApplyDays, setMaxLeaveApplyDays] = useState("");
  const [leaveDescription, setLeaveDescription] = useState("");
  const [keyfield, setKeyfield] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const location = useLocation();
  const { mode, selectedRow } = location.state || {};

 const toInputDate = (value) => {
  if (!value) return "";

  // If already yyyy-MM-dd → return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // If dd-MM-yyyy → convert
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Try normal Date parsing (ISO / SQL datetime)
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  return d.toISOString().split("T")[0];
};

  useEffect(() => {
    if (mode === "update" && selectedRow) {
      setLeaveCode(selectedRow.Leave_Code || "");
      setLeaveName(selectedRow.Leave_Name || "");
      setLeaveDescription(selectedRow.Leave_Description || "");
      setMinLeaveApplyDays(selectedRow.Min_Leave_Apply_Days || "");
      setMaxLeaveApplyDays(selectedRow.Max_Leave_Apply_Days || "");
      setKeyfield(selectedRow.Keyfield || "");

      setEffectiveFrom(toInputDate(selectedRow.Effective_From));
      setEffectiveTo(toInputDate(selectedRow.Effective_To));

      setStatus(selectedRow.Is_Active);
      setSelectedStatus({
        label: selectedRow.Is_Active ? "Active" : "Close",
        value: selectedRow.Is_Active,
      });
    } else if (mode === "create") {
      clearInputFields();
    }
  }, [mode, selectedRow]);

  const clearInputFields = () => {
    setLeaveCode("");
    setEffectiveFrom("");
    setMinLeaveApplyDays("");
    setStatus("");
    setSelectedStatus("");
    setLeaveName("");
    setEffectiveTo("");
    setMaxLeaveApplyDays("");
    setLeaveDescription("");
  };

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");

    fetch(`${config.apiBaseUrl}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((data) => data.json())
      .then((val) => setStatusdrop(val))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

   const filteredOptionStatus = Array.isArray(statusdrop)
    ? statusdrop.map((option) => ({
      value: option.attributedetails_name,
      label: option.attributedetails_name,
    }))
    : [];

  const handleChangeStatus = (selectedStatus) => {
    setSelectedStatus(selectedStatus);
    setStatus(selectedStatus ? selectedStatus.value : "");
  };

  const handleNavigate = () => {
    navigate("/LeaveMasterGrid");
  };

  const handleInsert = async () => {
    if (
      !leaveCode ||
      !leaveName ||
      status === null || status === undefined ||
      !effectiveFrom ||
      !effectiveTo 
      // !minLeaveApplyDays ||
      // !maxLeaveApplyDays
    ) {
      setError(" ");
      toast.warning("Missing Required Fields");
      return;
    }
    setLoading(true);
    try {
      const mappedStatus = status === "Active" ? 1 : 0;
      const response = await fetch(`${config.apiBaseUrl}/LeaveMasterInsert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Company_Code: sessionStorage.getItem("selectedCompanyCode"),
          Leave_Code: leaveCode,
          Leave_Name: leaveName,
          Leave_Description: leaveDescription,
          Min_Leave_Apply_Days: minLeaveApplyDays || 0,
          Max_Leave_Apply_Days: maxLeaveApplyDays || 0,
          Effective_From: effectiveFrom,
          Effective_To: effectiveTo,
          Is_Active: mappedStatus,
          Created_By: sessionStorage.getItem("selectedUserCode"),
        }),
      });
      if (response.ok) {
        setTimeout(() => {
          toast.success("Data inserted Successfully", {
            onClose: () => clearInputFields(),
          });
        }, 1000);
      } else {
        const errorResponse = await response.json();
        console.error(errorResponse.message);
        toast.warning(errorResponse.message);
      }
    } catch (error) {
      console.error("Error inserting data:", error);
      toast.error("Error inserting data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    console.log(status)
    if (
      !leaveCode ||
      !leaveName ||
      status === null || status === undefined ||
      !effectiveFrom ||
      !effectiveTo 
      // !minLeaveApplyDays ||
      // !maxLeaveApplyDays
    ) {
      setError(" ");
      toast.warning("Missing Required Fields");
      return;
    }
    setLoading(true);
    try {
      const mappedStatus = status === "Active" ? 1 : 0;
      const response = await fetch(`${config.apiBaseUrl}/LeaveMasterUpdate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Company_Code: sessionStorage.getItem("selectedCompanyCode"),
          Leave_Code: leaveCode,
          Leave_Name: leaveName,
          Leave_Description: leaveDescription,
          Min_Leave_Apply_Days: minLeaveApplyDays || 0,
          Max_Leave_Apply_Days: maxLeaveApplyDays || 0,
          Effective_From: effectiveFrom,
          Effective_To: effectiveTo,
          Is_Active: mappedStatus,
          Keyfield: keyfield,
          Modified_By: sessionStorage.getItem("selectedUserCode"),
        }),
      });
      if (response.ok) {
        setTimeout(() => {
          toast.success("Data Updated Successfully", {
            onClose: () => clearInputFields(),
          });
        }, 1000);
      } else {
        const errorResponse = await response.json();
        console.error(errorResponse.message);
        toast.warning(errorResponse.message);
      }
    } catch (error) {
      console.error("Error inserting data:", error);
      toast.error("Error inserting data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid Topnav-screen">
      {loading && <LoadingScreen />}
      <ToastContainer
        position="top-right"
        className="toast-design"
        theme="colored"
      />
      <div>
        <div className="shadow-lg p-0 bg-body-tertiary rounded">
          <div className="mb-0 d-flex justify-content-between">
            <h1 className="">Holiday Details</h1>
            <button
              onClick={handleNavigate}
              className="btn btn-danger shadow-none rounded-0 h-70 fs-5"
              title="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div className="shadow-lg p-3 bg-body-tertiary rounded mt-2">
          <div className="row">
            <div className="col-md-6">
              <div className=" rounded p-3 bg-light">
                <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !leaveCode ? "text-danger" : ""
                    }`}
                  >
                    Holiday Code<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={leaveCode}
                      readOnly={mode === "update"}
                      onChange={(e) => setLeaveCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !effectiveFrom ? "text-danger" : ""
                    }`}
                  >
                    Effective From<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8">
                    <input
                      type="Date"
                      className="form-control"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                    />
                  </div>
                </div>
                {/* <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !minLeaveApplyDays ? "text-danger" : ""
                    }`}
                  >
                    Min Leave Apply Days<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={minLeaveApplyDays}
                      onChange={(e) => setMinLeaveApplyDays(e.target.value)}
                    />
                  </div>
                </div> */}
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">
                    Holiday Description
                  </label>
                  <div className="col-sm-8">
                    <textarea
                      type="text"
                      className="form-control"
                      value={leaveDescription}
                      onChange={(e) => setLeaveDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className=" rounded p-3 bg-light">
                <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !leaveName ? "text-danger" : ""
                    }`}
                  >
                    Holiday Name<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8 position-relative">
                    <input
                      type="text"
                      className="form-control pe-5"
                      value={leaveName}
                      onChange={(e) => setLeaveName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !effectiveTo ? "text-danger" : ""
                    }`}
                  >
                    Effective To<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8">
                    <input
                      type="Date"
                      className="form-control"
                      value={effectiveTo}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                    />
                  </div>
                </div>
                {/* <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !maxLeaveApplyDays ? "text-danger" : ""
                    }`}
                  >
                    Max Leave Apply Days<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8 position-relative">
                    <input
                      type="text"
                      className="form-control pe-5"
                      value={maxLeaveApplyDays}
                      onChange={(e) => setMaxLeaveApplyDays(e.target.value)}
                    />
                  </div>
                </div> */}
                <div className="row mb-3 align-items-center">
                  <label
                    className={`col-sm-4 col-form-label ${
                      error && !status ? "text-danger" : ""
                    }`}
                  >
                    Status<span className="text-danger">*</span>
                  </label>
                  <div className="col-sm-8">
                    <Select
                      id="status"
                      value={selectedStatus}
                      onChange={handleChangeStatus}
                      options={filteredOptionStatus}
                      className=""
                      placeholder=""
                      required
                    />
                  </div>
                </div>
                <div class="col-12 d-flex justify-content-end align-items-center">
                  {mode === "create" ? (
                    <button
                      onClick={handleInsert}
                      className="mt-4"
                      title="Save"
                    >
                      <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                  ) : (
                    <button
                      onClick={handleUpdate}
                      className="mt-4"
                      title="Update"
                    >
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div></div>
      </div>
    </div>
  );
}
export default LeaveMasterInput;