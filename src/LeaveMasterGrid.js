import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ItemDash.css";
import "./mobile.css";
import "./apps.css";
import "bootstrap/dist/css/bootstrap.min.css";
import config from "./Apiconfig";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import LoadingScreen from "./LoadingScreen";
import { useNavigate } from "react-router-dom";
import { showConfirmationToast } from "./ToastConfirmation";

const LeaveMasterGrid = () => {
  const [columnDefs] = useState([
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerName: "Holiday Code",
      field: "Leave_Code",
      cellClass: "ag-link-cell",
      minWidth: 200,
      editable: false,
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
      headerName: "Holiday Name",
      field: "Leave_Name",
      minWidth: 170,
      editable: true,
    },
    {
      headerName: "Holiday Description",
      field: "Leave_Description",
      minWidth: 130,
      editable: true,
    },
    {
      headerName: "Effective From",
      field: "Effective_From",
      minWidth: 150,
      editable: true,
    },
    {
      headerName: "Effective To",
      field: "Effective_To",
      minWidth: 150,
      editable: true,
    },
    // {
    //   headerName: "Min Leave Apply Days",
    //   field: "Min_Leave_Apply_Days",
    //   minWidth: 150,
    //   editable: true,
    // },
    // {
    //   headerName: "Max Leave Apply Days",
    //   field: "Max_Leave_Apply_Days",
    //   minWidth: 150,
    //   editable: true,
    // },
    {
      headerName: "Status",
      field: "Is_Active",
      minWidth: 100,
      editable: true,
    },
  ]);

  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editedData, setEditedData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const navigate = useNavigate();
  const [leaveCode, setLeaveCode] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [minLeaveApplyDays, setMinLeaveApplyDays] = useState("");
  const [status, setStatus] = useState("");
  const [statusdrop, setStatusdrop] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [maxLeaveApplyDays, setMaxLeaveApplyDays] = useState("");
  const [leaveDescription, setLeaveDescription] = useState("");

  const permissions = JSON.parse(sessionStorage.getItem("permissions")) || {};
  const leavePermission = permissions
    .filter((permission) => permission.screen_type === "LeaveMasterGrid")
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

  const gridRef = useRef(null);

  const onGridReady = (params) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);

    const savedColumns = localStorage.getItem("selectedColumns");
    if (savedColumns) {
      const columnState = JSON.parse(savedColumns);
      params.columnApi.applyColumnState({
        state: columnState,
        applyOrder: true,
      });
    }
  };

  useEffect(() => {
    const savedColumns = localStorage.getItem("selectedColumns");
    if (savedColumns) {
      const columnState = JSON.parse(savedColumns);
      if (gridRef.current) {
        gridRef.current.columnApi.applyColumnState({
          state: columnState,
          applyOrder: true,
        });
      }
    }
  }, []);

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

        row[col.headerName] = value ?? "";
      });

      reportData.push(row);
    });

    if (reportData.length === 0) {
      toast.warning("Please select at least one row to generate a report");
      return;
    }
    const reportWindow = window.open("", "_blank");
    reportWindow.document.write("<html><head><title>Holiday Master</title>");
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
    table-layout:fixed;
    margin-bottom:20px;
}

th,
td{
    padding:10px;
    border:1px solid #ddd;
    text-align:left;
    vertical-align:top;
    word-wrap:break-word;
}

th{
    background:maroon;
    color:#fff;
    font-weight:bold;
}

td{
    background:#fdd9b5;
}

tr:nth-child(even) td{
    background:#fff0e1;
}

.report-button{
    display:block;
    width:150px;
    margin:20px auto;
    padding:10px;
    background:maroon;
    color:#fff;
    border:none;
    cursor:pointer;
    font-size:16px;
    border-radius:5px;
}

.report-button:hover{
    background:darkred;
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
        -webkit-print-color-adjust:exact !important;
        print-color-adjust:exact !important;
    }
}
`);
    reportWindow.document.write("</style></head><body>");
    reportWindow.document.write("</style></head><body>");
    reportWindow.document.write("<h1><u>Holiday Master</u></h1>");

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

  const defaultColDef = {
    flex: 1,
    minWidth: 130,
  };

  const handleSearch = async () => {
    setLoading(true);

    try {
      let mappedStatus = null; // default to null
      if (status === "Active") mappedStatus = 1;
      else if (status === "Close") mappedStatus = 0;

      const response = await fetch(`${config.apiBaseUrl}/LeaveMasterSearch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Company_Code: sessionStorage.getItem("selectedCompanyCode"),
          Leave_Code: leaveCode,
          Leave_Name: leaveName,
          Leave_Description: leaveDescription,
          Min_Leave_Apply_Days: minLeaveApplyDays ? minLeaveApplyDays : 0,
          Max_Leave_Apply_Days: maxLeaveApplyDays ? maxLeaveApplyDays : 0,
          Is_Active: mappedStatus,
          Effective_From: effectiveFrom,
          Effective_To: effectiveTo,
        }),
      });

      if (response.ok) {
        const searchData = await response.json();
        setRowData(searchData);
      } else if (response.status === 404) {
        console.log("Data not found");
        setRowData([]);
        toast.warning("Data not found");
      } else {
        const errorResponse = await response.json();
        toast.warning(errorResponse.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching search data:", error);
      toast.error("Error fetching search data:", error);
    } finally {
      setLoading(false);
    }
  };

  const reloadGridData = () => {
    window.location.reload();
  };

  const handleNavigateWithRowData = (selectedRow) => {
    navigate("/AddLeaveMaster", { state: { mode: "update", selectedRow } });
  };

  const handleNavigatesToForm = () => {
    navigate("/AddLeaveMaster", { state: { mode: "create" } });
  };

  const onSelectionChanged = () => {
    const selectedNodes = gridApi.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    setSelectedRows(selectedData);
  };

  const onCellValueChanged = (params) => {
    const updatedRowData = [...rowData];
    const rowIndex = updatedRowData.findIndex(
      (row) => row.Keyfield === params.data.Keyfield,
    );

    if (rowIndex !== -1) {
      updatedRowData[rowIndex][params.colDef.field] = params.newValue;
      setRowData(updatedRowData);

      setEditedData((prevData) => {
        const existingIndex = prevData.findIndex(
          (row) => row.Keyfield === updatedRowData[rowIndex].Keyfield,
        );

        if (existingIndex !== -1) {
          const newData = [...prevData];
          newData[existingIndex] = updatedRowData[rowIndex];
          return newData;
        } else {
          return [...prevData, updatedRowData[rowIndex]];
        }
      });
    }
  };

  const deleteSelectedRows = async () => {
    const selectedRows = gridApi.getSelectedRows();

    const company_code = sessionStorage.getItem("selectedCompanyCode");

    const deletedData = selectedRows.map((row) => row.Keyfield);

    if (selectedRows.length === 0) {
      toast.warning("Please select atleast One Row to Delete");
      return;
    }
    showConfirmationToast(
      "Are you sure you want to Delete the data in the selected rows?",
      async () => {
        setLoading(true);

        try {
          const response = await fetch(
            `${config.apiBaseUrl}/LeaveMasterGridDelete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Company_Code: company_code,
              },
              body: JSON.stringify({ deletedData }),
              Company_Code: company_code,
            },
          );

          if (response.ok) {
            setTimeout(() => {
              toast.success("Data Deleted successfully");
              handleSearch();
            }, 1000);
          } else {
            const errorResponse = await response.json();
            toast.warning(errorResponse.message || "Failed to Delete");
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

  const saveEditedData = async () => {
    const modified_by = sessionStorage.getItem("selectedUserCode");

    const selectedRowsData = editedData.filter((row) =>
      selectedRows.some(
        (selectedRow) =>
          selectedRow.attributeheader_code === row.attributeheader_code,
      ),
    );

    const company_code = sessionStorage.getItem("selectedCompanyCode");
    if (selectedRowsData.length === 0) {
      toast.warning(
        "Please select and modify at least one row to update its data",
      );
      return;
    }

    showConfirmationToast(
      "Are you sure you want to update the data in the selected rows?",
      async () => {
        setLoading(true);

        try {
          const response = await fetch(
            `${config.apiBaseUrl}/LeaveMasterGridUpdate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Company_Code: company_code,
                Modified_By: modified_by,
              },
              body: JSON.stringify({
                editedData: selectedRowsData,
                Company_Code: company_code,
                Modified_By: modified_by,
              }),
            },
          );

          if (response.status === 200) {
            setTimeout(() => {
              toast.success("Data Updated Successfully");
              handleSearch();
            }, 3000);
            return;
          } else {
            const errorResponse = await response.json();
            toast.warning(errorResponse.message || "Failed to update");
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

  return (
    <div className="container-fluid Topnav-screen">
      {loading && <LoadingScreen />}
      <ToastContainer
        position="top-right"
        className="toast-design"
        theme="colored"
      />
      <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2">
        <div>
          <div className="d-flex justify-content-between ">
            <div className="d-flex justify-content-start ">
              <h1 className="purbut mt-3">Holiday Master</h1>
            </div>
            <div className="mobileview">
              <div className="d-flex justify-content-between">
                <div className="d-flex justify-content-start">
                  <h1 className="h1">Holiday Master</h1>
                </div>
                <div className="d-flex justify-content-end mt-1 me-5">
                  <div className="dropdown">
                    <button
                      className="btn btn-primary dropdown-toggle p-1"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="fa-solid fa-list"></i>
                    </button>
                    <ul className="dropdown-menu p-2">
                      {["add", "all permission"].some((permission) =>
                        leavePermission.includes(permission),
                      ) && (
                        <li className="mb-2">
                          <icon
                            class="iconbutton text-success d-flex justify-content-center"
                            onClick={handleNavigatesToForm}
                          >
                            <i className="fa-solid fa-plus"></i>
                          </icon>
                        </li>
                      )}
                      {["delete", "all permission"].some((permission) =>
                        leavePermission.includes(permission),
                      ) && (
                        <li className="mb-2">
                          <icon
                            class="iconbutton text-danger d-flex justify-content-center"
                            onClick={deleteSelectedRows}
                          >
                            <i className="fa-solid fa-minus"></i>
                          </icon>
                        </li>
                      )}
                      {["update", "all permission"].some((permission) =>
                        leavePermission.includes(permission),
                      ) && (
                        <li className="mb-2">
                          <icon
                            class="iconbutton d-flex justify-content-center"
                            onClick={saveEditedData}
                          >
                            <i className="fa-solid fa-floppy-disk"></i>
                          </icon>
                        </li>
                      )}
                      {["view", "all permission"].some((permission) =>
                        leavePermission.includes(permission),
                      ) && (
                        <li className="mb-2">
                          <icon
                            class="iconbutton d-flex justify-content-center"
                            onClick={handlePrint}
                          >
                            <i className="fa-solid fa-print"></i>
                          </icon>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="purbut">
              <div className="d-flex justify-content-end me-5">
                {["add", "all permission"].some((permission) =>
                  leavePermission.includes(permission),
                ) && (
                  <addbutton
                    className="purbut"
                    onClick={handleNavigatesToForm}
                    title="Add Holiday Details"
                  >
                    <i class="fa-solid fa-user-plus"></i>
                  </addbutton>
                )}
                {["delete", "all permission"].some((permission) =>
                  leavePermission.includes(permission),
                ) && (
                  <delbutton
                    className="purbut"
                    onClick={deleteSelectedRows}
                    title="Delete Holiday Details"
                  >
                    <i class="fa-solid fa-user-minus"></i>
                  </delbutton>
                )}
                {["update", "all permission"].some((permission) =>
                  leavePermission.includes(permission),
                ) && (
                  <savebutton
                    className="purbut"
                    onClick={saveEditedData}
                    title="Update Holiday Details"
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                  </savebutton>
                )}
                {["view", "all permission"].some((permission) =>
                  leavePermission.includes(permission),
                ) && (
                  <printbutton
                    className="purbut"
                    onClick={handlePrint}
                    title="Generate Report"
                  >
                    <i className="fa-solid fa-print"></i>
                  </printbutton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2 mt-2">
          <div className="row ms-4 mt-3 mb-3 me-4">
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Holiday Code</label>
              <input
                type="text"
                className="form-control exp-input-field"
                value={leaveCode}
                onChange={(e) => setLeaveCode(e.target.value)}
                title="Please Enter the Holiday Code"
              />
            </div>
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Holiday Name</label>
              <input
                type="text"
                className="form-control exp-input-field"
                value={leaveName}
                onChange={(e) => setLeaveName(e.target.value)}
                title="Please Enter the Holiday Name"
              />
            </div>
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Effective From</label>
              <input
                type="Date"
                className="form-control exp-input-field"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                title="Please Enter the Effective From"
              />
            </div>
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Effective To</label>
              <input
                type="Date"
                className="form-control exp-input-field"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                title="Please Enter the Effective To"
              />
            </div>
            {/* <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Min Leave Apply Days</label>
              <input
                type="text"
                className="form-control exp-input-field"
                value={minLeaveApplyDays}
                onChange={(e) => setMinLeaveApplyDays(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Max Leave Apply Days</label>
              <input
                type="text"
                className="form-control exp-input-field"
                value={maxLeaveApplyDays}
                onChange={(e) => setMaxLeaveApplyDays(e.target.value)}
              />
            </div> */}
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Status</label>
              <div title="Please Select the Status">
                <Select
                  id="wcode"
                  className="exp-input-field"
                  placeholder=""
                  value={selectedStatus}
                  options={filteredOptionStatus}
                  onChange={handleChangeStatus}
                />
              </div>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Holiday Description</label>
              <textarea
                id="wcode"
                className="form-control exp-input-field"
                placeholder=""
                autoComplete="off"
                value={leaveDescription}
                onChange={(e) => setLeaveDescription(e.target.value)}
                title="Please Enter the Holiday Description"
              />
            </div>
            <div class="col-12 d-flex justify-content-end align-items-center mt-4">
              <div class="exp-form-floating">
                <div class=" d-flex  justify-content-center">
                  <div class="">
                    <icon
                      className=" text-dark popups-btn fs-6"
                      onClick={handleSearch}
                      required
                      title="Search"
                    >
                      <i class="fa-solid fa-magnifying-glass"></i>
                    </icon>
                  </div>
                  <div>
                    <icon
                      className=" popups-btn text-dark fs-6"
                      onClick={reloadGridData}
                      required
                      title="Refresh"
                    >
                      <i class="fa-solid fa-arrow-rotate-right"></i>
                    </icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="ag-theme-alpine mb-4"
            style={{ height: 455, width: "100%" }}
          >
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              pagination={true}
              paginationAutoPageSize={true}
              onGridReady={onGridReady}
              defaultColDef={defaultColDef}
              rowHeight={30}
              headerHeight={30}
              rowSelection="multiple"
              //   onRowClicked={handleRowClick}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveMasterGrid;
