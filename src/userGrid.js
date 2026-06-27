import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./apps.css";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import { showConfirmationToast } from "./ToastConfirmation";
import labels from "./Labels";
import LoadingScreen from "./LoadingScreen";

function UserGrid() {
  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const navigate = useNavigate();
  const [editedData, setEditedData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [user_code, setuser_code] = useState("");
  const [user_name, setuser_name] = useState("");
  const [first_name, setfirst_name] = useState("");
  const [last_name, setlast_name] = useState("");
  const [user_status, setuser_status] = useState("");
  const [user_type, setuser_type] = useState("");
  const [dob, setdob] = useState("");
  const [gender, setgender] = useState("");
  const config = require("./Apiconfig");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [statusdrop, setStatusdrop] = useState([]);
  const [Usertypedrop, setUsertypedrop] = useState([]);
  const [Genderdrop, setGenderdrop] = useState([]);
  const [statusgriddrop, setStatusGriddrop] = useState([]);
  const [usergriddrop, setUserGriddrop] = useState([]);
  const [gendergriddrop, setGenderGriddrop] = useState([]);
  const [roleDrop, setRoleDrop] = useState([]);
  const [loggriddrop, setLogGriddrop] = useState([]);
  const [hasValueChanged, setHasValueChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdBy, setCreatedBy] = useState("");
  const [modifiedBy, setModifiedBy] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [modifiedDate, setModifiedDate] = useState("");
  const [error, setError] = useState("");

  const [ExpiryFromDate, setExpiryFromDate] = useState("");
  const [ExpiryToDate, setExpiryToDate] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [role_id, setRole] = useState("");

  //code added by Harish purpose of set user permisssion
  const permissions = JSON.parse(sessionStorage.getItem("permissions")) || {};
  const userPermission = permissions
    .filter((permission) => permission.screen_type === "User")
    .map((permission) => permission.permission_type.toLowerCase());

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");

    fetch(`${config.apiBaseUrl}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((response) => response.json())
      .then((data) => {
        const statusOption = data.map((option) => option.attributedetails_name);
        setStatusGriddrop(statusOption);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");

    fetch(`${config.apiBaseUrl}/Usertype`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((response) => response.json())
      .then((data) => {
        const statusOption = data.map((option) => option.attributedetails_name);
        setUserGriddrop(statusOption);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");
    fetch(`${config.apiBaseUrl}/gender`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((response) => response.json())
      .then((data) => {
        const statusOption = data.map((option) => option.attributedetails_name);
        setGenderGriddrop(statusOption);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");

    fetch(`${config.apiBaseUrl}/UserRole`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((response) => response.json())
      .then((data) => {
        const roleOption = data.map((option) => ({
          value: option.role_id,
          label: `${option.role_id} - ${option.role_name}`,
        }));

        setRoleDrop(roleOption);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");

    fetch(`${config.apiBaseUrl}/UserRole`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((data) => data.json())
      .then((val) => setRoleDrop(val))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");
    fetch(`${config.apiBaseUrl}/Loginorout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((response) => response.json())
      .then((data) => {
        const statusOption = data.map((option) => option.attributedetails_name);
        setLogGriddrop(statusOption);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

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

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");
    fetch(`${config.apiBaseUrl}/Usertype`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((data) => data.json())
      .then((val) => setUsertypedrop(val))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    const company_code = sessionStorage.getItem("selectedCompanyCode");
    fetch(`${config.apiBaseUrl}/gender`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_code }),
    })
      .then((data) => data.json())
      .then((val) => setGenderdrop(val))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  const filteredOptionStatus = Array.isArray(statusdrop)
    ? statusdrop.map((option) => ({
        value: option.attributedetails_name,
        label: option.attributedetails_name,
      }))
    : [];

  const filteredOptionUser = Usertypedrop.map((option) => ({
    value: option.attributedetails_name,
    label: option.attributedetails_name,
  }));

  const filteredOptionGender = Array.isArray(Genderdrop)
    ? Genderdrop.map((option) => ({
        value: option.attributedetails_name,
        label: option.attributedetails_name,
      }))
    : [];

  const filteredOptionRole = Array.isArray(roleDrop)
    ? roleDrop.map((option) => ({
        value: option.role_id,
        label: `${option.role_id} - ${option.role_name}`,
      }))
    : [];

  const handleChangeStatus = (selectedStatus) => {
    setSelectedStatus(selectedStatus);
    setuser_status(selectedStatus ? selectedStatus.value : "");
    setHasValueChanged(true);
  };

  const handleChangeUser = (selectedUser) => {
    setSelectedUser(selectedUser);
    setuser_type(selectedUser ? selectedUser.value : "");
    setHasValueChanged(true);
  };

  const handleChangeGender = (selectedGender) => {
    setSelectedGender(selectedGender);
    setgender(selectedGender ? selectedGender.value : "");
    setHasValueChanged(true);
  };

  const handleChangeRole = (selectedRole) => {
    setSelectedRole(selectedRole);
    setRole(selectedRole ? selectedRole.value : "");
  };

  const handleNavigateToForm = () => {
    navigate("/AddUser", { state: { mode: "create" } });
  };

  const handleNavigateWithRowData = (selectedRow) => {
    navigate("/AddUser", { state: { mode: "update", selectedRow } });
  };

  const reloadGridData = () => {
    try {
      window.location.reload();
    } catch (error) {
      console.error("Error reloading grid data:", error);
    }
  };

  const handleSearch = async () => {
    try {
      if (
        ExpiryFromDate &&
        ExpiryToDate &&
        new Date(ExpiryFromDate) > new Date(ExpiryToDate)
      ) {
        toast.warning(
          "Expiry From Date should not be greater than Expiry To Date",
        );
        return;
      }
      setLoading(true);
      const company_code = sessionStorage.getItem("selectedCompanyCode");
      const created_by = sessionStorage.getItem("selectedUserCode");
      const response = await fetch(`${config.apiBaseUrl}/usersearchcriteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          company_code: company_code,
        },
        body: JSON.stringify({
          company_code: company_code,
          created_by: created_by,
          user_code,
          user_name,
          first_name,
          last_name,
          user_status,
          user_type,
          dob,
          gender,
          ExpiryFromDate,
          ExpiryToDate,
          role_id,
        }),
      });

      if (response.ok) {
        const searchData = await response.json();
        setRowData(searchData);

        console.log("Data fetched successfully");
      } else if (response.status === 404) {
        console.log("Data not found");
        toast.warning("Data not found");
        setRowData([]);
      } else {
        const errorResponse = await response.json();
        toast.warning(errorResponse.message || "Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Error updating data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerName: "User Code",
      field: "user_code",
      cellClass: "ag-link-cell",
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      maxWidth: 150,
      cellEditorParams: {
        maxLength: 18,
      },
      cellRenderer: (params) => {
        const handleClick = () => {
          handleNavigateWithRowData(params.data);
        };

        return (
          <span style={{ cursor: "pointer" }} onClick={handleClick}>
            {params.value}
          </span>
        );
      },
    },
    {
      headerName: "User Name",
      field: "user_name",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      cellEditorParams: {
        maxLength: 250,
      },
    },
    {
      headerName: "First Name",
      field: "first_name",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      maxWidth: 150,
      cellEditorParams: {
        maxLength: 250,
      },
    },
    {
      headerName: "Last Name",
      field: "last_name",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      cellEditorParams: {
        maxLength: 250,
      },
    },
    {
      headerName: "User Status",
      field: "user_status",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: statusgriddrop,
      },
    },
    {
      headerName: "Log In/Out",
      field: "log_in_out",
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: loggriddrop,
        maxLength: 150,
      },
    },
    // {
    //   headerName: "User Type",
    //   field: "user_type",
    //   editable: true,
    //   cellStyle: { textAlign: "left" },
    //   minWidth: 150,
    //   cellEditor: "agSelectCellEditor",
    //   cellEditorParams: {
    //     maxLength: 50,
    //     values: usergriddrop,
    //   },
    // },
    {
      headerName: "Email Id",
      field: "email_id",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      valueFormatter: (params) => {
        return params.value ? params.value.toLowerCase() : "";
      },
      cellEditorParams: {
        maxLength: 150,
      },
    },
    // {
    //   headerName: "DOB",
    //   field: "dob",
    //   editable: true,
    //   cellStyle: { textAlign: "left" },
    //   minWidth: 150,

    //   valueSetter: (params) => {
    //     if (!params.newValue) return false;

    //     const selectedDate = new Date(params.newValue);
    //     const today = new Date();
    //     today.setHours(0, 0, 0, 0);

    //     if (selectedDate > today) {
    //       toast.warning("Future dates are not allowed for DOB");
    //       return false;
    //     }

    //     params.data.dob = params.newValue;
    //     return true;
    //   },
    //   // valueFormatter: (params) => {
    //   //   if (!params.value) return "";
    //   //   const date = new Date(params.value);
    //   //   const day = date.getDate().toString().padStart(2, "0");
    //   //   const month = (date.getMonth() + 1).toString().padStart(2, "0");
    //   //   const year = date.getFullYear();
    //   //   return `${day}/${month}/${year}`;
    //   // },
    // },
    {
      headerName: "Expiry Date",
      field: "expiry_date",
      editable: false,
      cellStyle: { textAlign: "left" },
      minWidth: 150,

      valueSetter: (params) => {
        if (!params.newValue) return false;

        const selectedDate = new Date(params.newValue);
        selectedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDob = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate(),
        );
        maxDob.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          toast.warning("Future dates are not allowed for DOB");
          return false;
        }

        if (selectedDate > maxDob) {
          toast.warning("Age must be 18 years or above");
          return false;
        }

        params.data.dob = params.newValue;
        return true;
      },
    },
    {
      headerName: "DOB",
      field: "dob",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,

      valueSetter: (params) => {
        if (!params.newValue) return false;

        const selectedDate = new Date(params.newValue);
        selectedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDob = new Date(
          today.getFullYear() - 18,
          today.getMonth(),
          today.getDate(),
        );
        maxDob.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          toast.warning("Future dates are not allowed for DOB");
          return false;
        }

        if (selectedDate > maxDob) {
          toast.warning("Age must be 18 years or above");
          return false;
        }

        params.data.dob = params.newValue;
        return true;
      },
    },
    {
      headerName: "Gender",
      field: "gender",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        maxLength: 10,
        values: gendergriddrop,
      },
    },
    {
      headerName: "Role ID",
      field: "role_id",
      editable: true,
      cellStyle: { textAlign: "left" },
      minWidth: 150,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: roleDrop.map((d) => d.value),
      },
      valueFormatter: (params) => {
        const role = roleDrop.find((d) => d.value === params.value);
        return role ? role.label : params.value;
      },
    },
    {
      headerName: "Expiry Date",
      field: "expiry_date",
      editable: true,
      hide: true,
      valueFormatter: (params) => {
        if (!params.value) return "";

        const date = new Date(params.value);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${month}-${day}-${year}`;
      },
      cellStyle: { textAlign: "left" },
      minWidth: 150,
    },
  ];

  const defaultColDef = {
    resizable: true,
    wrapText: true,
    flex: 1,
  };

  const onGridReady = (params) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  const handlePrint = () => {
    // Columns exactly as shown in AG Grid
    const displayedColumns = gridApi
      .getAllDisplayedColumns()
      .map((col) => col.getColDef());

    const reportData = [];

    // Selected rows in the same order as AG Grid
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (!node.isSelected()) return;

      const row = {};

      displayedColumns.forEach((col) => {
        let value = node.data?.[col.field];

        // Format date fields if required
        if (["dob", "DOB"].includes(col.field)) {
          value = value
            ? new Date(value).toLocaleDateString("en-GB").replace(/\//g, "-")
            : "";
        }

        row[col.headerName] = value ?? "";
      });

      reportData.push(row);
    });

    if (reportData.length === 0) {
      toast.warning("Please select at least one row to generate a report");
      return;
    }

    const reportWindow = window.open("", "_blank");
    reportWindow.document.write("<html><head><title>User</title>");
    reportWindow.document.write("<style>");
    reportWindow.document.write(`
*{
    box-sizing:border-box;
}

html,
body{
    margin:20px;
    padding:0;
    font-family:Arial,sans-serif;
    background:#fff;
    color:#000;
}

h1{
    color:maroon;
    text-align:center;
    font-size:24px;
    margin-bottom:30px;
    text-decoration:underline;
}

table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:20px;
    table-layout:fixed;
}

th,
td{
    padding:10px;
    text-align:left;
    border:1px solid #ddd;
    vertical-align:top;
    word-wrap:break-word;
}

th{
    background-color:maroon;
    color:#fff;
    font-weight:bold;
}

td{
    background-color:#fdd9b5;
}

tr:nth-child(even) td{
    background-color:#fff0e1;
}

.report-button{
    display:block;
    width:150px;
    margin:20px auto;
    padding:10px;
    background-color:maroon;
    color:white;
    border:none;
    cursor:pointer;
    font-size:16px;
    border-radius:5px;
}

.report-button:hover{
    background-color:darkred;
}

@page{
    size:A4 portrait;
    margin:15mm;
}

@media print{

    html,
    body{
        margin:0;
        padding:0;
        background:#fff;
        -webkit-print-color-adjust:exact !important;
        print-color-adjust:exact !important;
    }

    .report-button{
        display:none !important;
    }

    table{
        width:100%;
        border-collapse:collapse;
    }

    th,
    td{
        border:1px solid #ddd;
        -webkit-print-color-adjust:exact !important;
        print-color-adjust:exact !important;
    }
}
`);
    reportWindow.document.write("</style></head><body>");
    reportWindow.document.write("<h1><u>User Report</u></h1>");

    reportWindow.document.write("<table><thead><tr>");
    Object.keys(reportData[0]).forEach((key) => {
      reportWindow.document.write(`<th>${key}</th>`);
    });
    reportWindow.document.write("</tr></thead><tbody>");

    reportData.forEach((row) => {
      reportWindow.document.write("<tr>");
      Object.values(row).forEach((value) => {
        reportWindow.document.write(`<td>${value}</td>`);
      });
      reportWindow.document.write("</tr>");
    });

    reportWindow.document.write("</tbody></table>");

    reportWindow.document.write(
      '<button class="report-button" onclick="window.print()">Print</button>',
    );
    reportWindow.document.write("</body></html>");
    reportWindow.document.close();
    reportWindow.focus();
  };

  const onSelectionChanged = () => {
    const selectedNodes = gridApi.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    setSelectedRows(selectedData);
  };

  const onCellValueChanged = (params) => {
    const updatedRowData = [...rowData];
    const rowIndex = updatedRowData.findIndex(
      (row) => row.user_code === params.data.user_code,
    );
    if (rowIndex !== -1) {
      updatedRowData[rowIndex][params.colDef.field] = params.newValue;
      setRowData(updatedRowData);

      setEditedData((prevData) => [...prevData, updatedRowData[rowIndex]]);
    }
  };

  const saveEditedData = async () => {
    const selectedRowsData = editedData.filter((row) =>
      selectedRows.some(
        (selectedRow) => selectedRow.user_code === row.user_code,
      ),
    );

    if (selectedRowsData.length === 0) {
      toast.warning("Please select a row to update its data");
      return;
    }

    showConfirmationToast(
      "Are you sure you want to update the data in the selected rows?",
      async () => {
        try {
          setLoading(true);

          const company_code = sessionStorage.getItem("selectedCompanyCode");
          const modified_by = sessionStorage.getItem("selectedUserCode");

          const response = await fetch(`${config.apiBaseUrl}/userupdate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              company_code: company_code,
              "Modified-By": modified_by,
            },
            body: JSON.stringify({ editedData: selectedRowsData }),
            company_code: company_code,
            modified_by: modified_by,
          });

          if (response.ok) {
            console.log("Data saved successfully!");
            setTimeout(() => {
              toast.success("Data Updated Successfully");
              handleSearch();
            }, 1000);
            return;
          } else {
            const errorResponse = await response.json();
            toast.warning(
              errorResponse.message || "Failed to update user data",
            );
          }
        } catch (error) {
          console.error("Error saving data:", error);
          toast.error("Error Updating Data: " + error.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.info("Data updated cancelled.");
      },
    );
  };

  const deleteSelectedRows = async () => {
    const selectedRows = gridApi.getSelectedRows();

    if (selectedRows.length === 0) {
      toast.warning("Please select atleast One Row to Delete");
      return;
    }

    const company_code = sessionStorage.getItem("selectedCompanyCode");
    const modified_by = sessionStorage.getItem("selectedUserCode");

    const user_codesToDelete = selectedRows.map((row) => row.user_code);

    showConfirmationToast(
      "Are you sure you want to Delete the data in the selected rows?",
      async () => {
        try {
          setLoading(true);

          const response = await fetch(`${config.apiBaseUrl}/userdelete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              company_code: company_code,
              "Modified-By": modified_by,
            },
            body: JSON.stringify({ user_codes: user_codesToDelete }),
            company_code: company_code,
            modified_by: modified_by,
          });

          if (response.ok) {
            console.log("Rows deleted successfully:", user_codesToDelete);
            setTimeout(() => {
              toast.success("Data Deleted successfully");
              handleSearch();
            }, 1000);
          } else {
            const errorResponse = await response.json();
            toast.warning(
              errorResponse.message || "Failed to delete user data",
            );
          }
        } catch (error) {
          console.error("Error deleting rows:", error);
          toast.error("Error Deleting Data: " + error.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.info("Data Delete cancelled.");
      },
    );
  };

  const handleKeyDownStatus = async (e) => {
    if (e.key === "Enter" && hasValueChanged) {
      await handleSearch();
      setHasValueChanged(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleRowClick = (rowData) => {
    setCreatedBy(rowData.created_by);
    setModifiedBy(rowData.modified_by);
    const formattedCreatedDate = formatDate(rowData.created_date);
    const formattedModifiedDate = formatDate(rowData.modified_date);
    setCreatedDate(formattedCreatedDate);
    setModifiedDate(formattedModifiedDate);
  };

  const onRowSelected = (event) => {
    if (event.node.isSelected()) {
      handleRowClick(event.data);
    }
  };

  return (
    <div className="container-fluid Topnav-screen">
      <div>
        {loading && <LoadingScreen />}
        <ToastContainer
          position="top-right"
          className="toast-design"
          theme="colored"
        />
        <div className="shadow-lg p-0 bg-body-tertiary rounded  mb-2 mt-2">
          <div className=" d-flex justify-content-between  ">
            <div class="d-flex justify-content-start">
              <h1 align="left" className="purbut ">
                User
              </h1>
            </div>
            <div className="d-flex justify-content-end purbut me-3">
              {["add", "all permission"].some((permission) =>
                userPermission.includes(permission),
              ) && (
                <addbutton
                  className="purbut"
                  onClick={handleNavigateToForm}
                  required
                  title="Add User"
                  class="purbut"
                >
                  <i class="fa-solid fa-user-plus"></i>{" "}
                </addbutton>
              )}
              {["delete", "all permission"].some((permission) =>
                userPermission.includes(permission),
              ) && (
                <delbutton
                  onClick={deleteSelectedRows}
                  class="purbut"
                  required
                  title="Delete"
                >
                  <i class="fa-solid fa-user-minus"></i>
                </delbutton>
              )}
              {["update", "all permission"].some((permission) =>
                userPermission.includes(permission),
              ) && (
                <savebutton
                  class="purbut"
                  onClick={saveEditedData}
                  required
                  title="Update"
                >
                  <i class="fa-solid fa-floppy-disk"></i>
                </savebutton>
              )}
              {["view", "all permission"].some((permission) =>
                userPermission.includes(permission),
              ) && (
                <printbutton
                  class="purbut"
                  onClick={handlePrint}
                  required
                  title="Generate Report"
                >
                  <i class="fa-solid fa-print"></i>
                </printbutton>
              )}
            </div>
            <div class="mobileview">
              <div class="d-flex justify-content-between">
                <div className="d-flex justify-content-start">
                  <h1 align="left" className="h1 me-5 ms-0">
                    User{" "}
                  </h1>
                </div>
                <div class="dropdown mt-1 me-5 ms-5">
                  <button
                    class="btn btn-primary dropdown-toggle p-1 "
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i class="fa-solid fa-list"></i>
                  </button>
                  <ul class="dropdown-menu menu">
                    {["add", "all permission"].some((permission) =>
                      userPermission.includes(permission),
                    ) && (
                      <li class="iconbutton d-flex justify-content-center text-success">
                        <icon class="icon" onClick={handleNavigateToForm}>
                          <i class="fa-solid fa-user-plus"></i>
                        </icon>
                      </li>
                    )}
                    {["delete", "all permission"].some((permission) =>
                      userPermission.includes(permission),
                    ) && (
                      <li class="iconbutton  d-flex justify-content-center text-danger">
                        <icon class="icon" onClick={deleteSelectedRows}>
                          <i class="fa-solid fa-user-minus"></i>
                        </icon>
                      </li>
                    )}
                    {["update", "all permission"].some((permission) =>
                      userPermission.includes(permission),
                    ) && (
                      <li class="iconbutton  d-flex justify-content-center text-primary ">
                        <icon class="icon" onClick={saveEditedData}>
                          <i class="fa-solid fa-floppy-disk"></i>
                        </icon>
                      </li>
                    )}
                    {["view", "all permission"].some((permission) =>
                      userPermission.includes(permission),
                    ) && (
                      <li class="iconbutton  d-flex justify-content-center ">
                        <icon class="icon" onClick={handlePrint}>
                          <i class="fa-solid fa-print"></i>
                        </icon>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="shadow-lg p-1 bg-body-tertiary rounded  mb-2 mt-2">
          <div className="row  mt-3 mb-3 ms-1 me-1">
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="usercode" class="exp-form-labels">
                  User Code
                </label>
                <input
                  id="usercode"
                  className="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required
                  title="Please fill the user code here"
                  value={user_code}
                  onChange={(e) => setuser_code(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  maxLength={18}
                />
              </div>
            </div>
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="username" class="exp-form-labels">
                  User Name
                </label>
                <input
                  id="username"
                  className="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required
                  title="Please fill the user name here"
                  value={user_name}
                  onChange={(e) => setuser_name(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  maxLength={250}
                />
              </div>
            </div>
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="firstname" class="exp-form-labels">
                  First Name
                </label>
                <input
                  id="firstname"
                  className="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required
                  title="Please fill the first name here"
                  value={first_name}
                  onChange={(e) => setfirst_name(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  maxLength={250}
                />
              </div>
            </div>
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="lastname" class="exp-form-labels">
                  Last Name
                </label>
                <input
                  id="lastname"
                  className="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required
                  title="Please fill the last name here"
                  value={last_name}
                  onChange={(e) => setlast_name(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  maxLength={250}
                />
              </div>
            </div>
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="usts" class="exp-form-labels">
                  Status
                </label>
                <div title="Please select the Status">
                  <Select
                    id="status"
                    value={selectedStatus}
                    onChange={handleChangeStatus}
                    onKeyDown={handleKeyDownStatus}
                    options={filteredOptionStatus}
                    className="exp-input-field"
                    placeholder=""
                  />
                </div>
              </div>
            </div>
            {/* <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="utype" class="exp-form-labels">
                  User Type
                </label>
                <Select
                  id="usertype"
                  value={selectedUser}
                  onChange={handleChangeUser}
                  onKeyDown={handleKeyDownStatus}
                  options={filteredOptionUser}
                  className="exp-input-field"
                  placeholder=""
                />
              </div>
            </div> */}
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="dob" class="exp-form-labels">
                  DOB
                </label>
                <input
                  id="dob"
                  className="exp-input-field form-control"
                  type="date"
                  placeholder=""
                  required
                  title="Please fill the DOB here"
                  value={dob}
                  onChange={(e) => setdob(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <div className="col-md-3 form-group mb-2">
              <div className="exp-form-floating">
                <label className="exp-form-labels">Expiry From Date</label>

                <input
                  className="exp-input-field form-control"
                  type="date"
                  value={ExpiryFromDate}
                  onChange={(e) => setExpiryFromDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3 form-group mb-2">
              <div className="exp-form-floating">
                <label className="exp-form-labels">Expiry To Date</label>

                <input
                  className="exp-input-field form-control"
                  type="date"
                  value={ExpiryToDate}
                  min={ExpiryFromDate || undefined}
                  onChange={(e) => setExpiryToDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3 form-group">
              <div class="exp-form-floating">
                <label for="gender" class="exp-form-labels">
                  Gender
                </label>
                <div title="Please select the Gender">
                  <Select
                    id="gender"
                    value={selectedGender}
                    onChange={handleChangeGender}
                    onKeyDown={handleKeyDownStatus}
                    options={filteredOptionGender}
                    className="exp-input-field"
                    placeholder=""
                  />
                </div>
              </div>
            </div>
            <div className="col-md-3 form-group  mb-2 ">
              <div class="exp-form-floating">
                <div class="d-flex justify-content-start">
                  <div>
                    <label for="state" class="exp-form-labels">
                      Role ID
                    </label>
                  </div>
                </div>
                <div title="Please select the Role ID">
                  <Select
                    id="usertype"
                    value={selectedRole}
                    onChange={handleChangeRole}
                    options={filteredOptionRole}
                    className="exp-input-field"
                    placeholder=""
                    maxLength={50}
                    isClearable
                  />
                </div>
              </div>
            </div>
            <div className="col-12 d-flex justify-content-end align-items-center mt-4">
              <div class="exp-form-floating">
                <div class=" d-flex  justify-content-center">
                  <div class="">
                    <icon
                      className="popups-btn fs-6 p-3"
                      onClick={handleSearch}
                      required
                      title="Search"
                    >
                      <i className="fas fa-search"></i>
                    </icon>
                  </div>
                  <div>
                    <icon
                      className="popups-btn fs-6 p-3"
                      onClick={reloadGridData}
                      required
                      title="Refresh"
                    >
                      <FontAwesomeIcon icon="fa-solid fa-arrow-rotate-right" />
                    </icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="ag-theme-alpine" style={{ height: 390, width: "100%" }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              onCellValueChanged={onCellValueChanged}
              rowSelection="multiple"
              onSelectionChanged={onSelectionChanged}
              pagination={true}
              onRowSelected={onRowSelected}
            />
          </div>
        </div>
      </div>
      <div className="shadow-lg p-2 bg-body-tertiary rounded mt-2 mb-2">
        <div className="row ms-2">
          <div className="d-flex justify-content-start">
            <p className="col-md-6">
              {labels.createdBy}: {createdBy}
            </p>
            <p className="col-md-">
              {labels.createdDate}: {createdDate}
            </p>
          </div>
          <div className="d-flex justify-content-start">
            <p className="col-md-6">
              {labels.modifiedBy}: {modifiedBy}
            </p>
            <p className="col-md-6">
              {labels.modifiedDate} : {modifiedDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserGrid;
