import React, { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './ItemDash.css';
import './mobile.css';
import './apps.css';
import * as XLSX from 'xlsx';
import "bootstrap/dist/css/bootstrap.min.css";
import config from './Apiconfig';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from './LoadingScreen';
import { useNavigate } from "react-router-dom";
import { showConfirmationToast } from './ToastConfirmation';

const DCanalysis = () => {

  const [columnDefs] = useState([
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerName: "Employee ID",
      field: "employeeId",
      minWidth: 200,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Employee Name",
      field: "employeeName",
      minWidth: 170,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Join Date",
      field: "joinDate",
      minWidth: 130,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Natioality",
      field: "nationality",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Designation",
      field: "designation",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Location",
      field: "location",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Department",
      field: "department",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "PassportNo.",
      field: "passportNo",
      minWidth: 100,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "Grade",
      field: "grade",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
    {
      headerName: "CPRNo",
      field: "CPRNo",
      minWidth: 150,
      cellStyle: { cursor: "pointer" },
    },
  ]);

  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [department, setDepartment] = useState("");
  const [column, setColumn] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentDrop, setDepartmentDrop] = useState([]);
  const [columnDrop, setColumnDrop] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const companyName = sessionStorage.getItem('selectedCompanyName');
  const userName = sessionStorage.getItem('selectedUserName');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangeDepartment = (selectedDepartment) => {
    setSelectedDepartment(selectedDepartment);
    setDepartment(selectedDepartment.value);
  };

   const filteredOptionDepartment = Array.isArray(departmentDrop)
    ? departmentDrop.map((option) => ({
      value: option.TypeDs,
      label: option.TypeDs,
    }))
    : [];

   //code added by Harish purpose of set user permisssion
  const permissions = JSON.parse(sessionStorage.getItem("permissions")) || {};
  const employeeInfoPermission = permissions
    .filter((permission) => permission.screen_type === "EmployeeInfo")
    .map((permission) => permission.permission_type.toLowerCase());

  const formatDate = (dateString) => {
    const [month, day, year] = dateString.includes("/") ? dateString.split("/") : dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    fetch(`${config.apiBaseUrl}/getDeptType_Atte_Report`)
      .then((data) => data.json())
      .then((val) => {
        setDepartmentDrop(val);

        if (val.length > 0) {
          const firstOption = {
            value: val[0].TypeDs,
            label: val[0].TypeDs,
          };
          setSelectedDepartment(firstOption);
          setDepartment(firstOption.value);
        }
      });
  }, []);

  const handleChangeColumn = (selectedColumn) => {
    setSelectedColumn(selectedColumn);
    setColumn(selectedColumn.value);
  };

     const filteredOptionColumn = Array.isArray(columnDrop)
    ? columnDrop.map((option) => ({
      value: option.descriptions,
      label: option.attributedetails_name,
    }))
    : [];

  useEffect(() => {
    const company_code = sessionStorage.getItem('selectedCompanyCode');

    fetch(`${config.apiBaseUrl}/getColumn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_code })
    })
      .then((data) => data.json())
      .then((val) => {
        setColumnDrop(val);
        if (val.length > 0) {
          const firstOption = {
            value: val[1].descriptions,
            label: val[1].attributedetails_name,
          };
          setSelectedColumn(firstOption);
          setColumn(firstOption.value);
        }
      });
  }, []);

  useEffect(() => {
    if (department) {
      fetchEmployeeData();
    }
  }, [department]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      const body = {
        dept_type: department,
      };

      const response = await fetch(`${config.apiBaseUrl}/getEmployeeBasicDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const fetchedData = await response.json();
        // Convert API response into AG Grid format
        const formattedData = fetchedData.map((item) => ({
          CPRNo: item.CPRNo,
          Grade: item.Grade,
          department: item.Department,
          designation: item.Designation,
          employeeId: item["Employee ID"],
          employeeName: item["Employee Name"],
          joinDate: item["Join Date"] ? item["Join Date"].split("T")[0] : "",
          location: item.Location,
          nationality: item.Natioality || "N/A",
          passportNo: item.PassportNo || "N/A",
        }));

        setRowData(formattedData);
      } else if (response.status === 404) {
        console.log("Data Not found");
        toast.warning("Data Not found");
        setRowData([])
      } else {
        const errorResponse = await response.json();
        toast.warning(errorResponse.message || "Failed to get data");
        console.error(errorResponse.details || errorResponse.message);
      }
    } catch (error) {
      console.error("Error fetching search data:", error);
    } finally {
      setLoading(false); // Stop loading in both success and error cases
    }
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
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one row to generate a report");
      return;
    }

    const reportData = selectedRows.map((row) => {
      return {
        "Employee ID": row.employeeId,
        "Employee Name": row.employeeName,
        "Join Date": row.joinDate,
        "Department": row.department,
        "Designation": row.designation,
        "Grade": row.Grade,
        "CPRNo": row.CPRNo,
        "Location": row.location,
        "Natioality": row.nationality,
        "PassportNo": row.passportNo,
      };
    });
    const reportWindow = window.open("", "_blank");
    reportWindow.document.write("<html><head><title>Employee Master</title>");
    reportWindow.document.write("<style>");
    reportWindow.document.write(`
      body {
          font-family: Arial, sans-serif;
          margin: 20px;
      }
      h1 {
          color: maroon;
          text-align: center;
          font-size: 24px;
          margin-bottom: 30px;
          text-decoration: underline;
      }
      table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
      }
      th, td {
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
          vertical-align: top;
      }
      th {
          background-color: maroon;
          color: white;
          font-weight: bold;
      }
      td {
          background-color: #fdd9b5;
      }
      tr:nth-child(even) td {
          background-color: #fff0e1;
      }
      .report-button {
          display: block;
          width: 150px;
          margin: 20px auto;
          padding: 10px;
          background-color: maroon;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 16px;
          text-align: center;
          border-radius: 5px;
      }
      .report-button:hover {
          background-color: darkred;
      }
      @media print {
          .report-button {
              display: none;
          }
          body {
              margin: 0;
              padding: 0;
          }
      }
    `);
    reportWindow.document.write("</style></head><body>");
    reportWindow.document.write("<h1><u>Employee Master</u></h1>");

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
      '<button class="report-button" onclick="window.print()">Print</button>'
    );
    reportWindow.document.write("</body></html>");
    reportWindow.document.close();
  };


  const transformRowData = (data) => {
    return data.map(row => ({
      "Employee ID": row.employeeId,
      "Employee Name": row.employeeName,
      "Join Date": formatDate(row.joinDate),
      "Department": row.department,
      "Designation": row.designation,
      "Grade": row.Grade,
      "CPRNo": row.CPRNo,
      "Location": row.location,
      "Natioality": row.nationality,
      "PassportNo": row.passportNo,
    }));
  };

  const handleExportToExcel = () => {
    if (rowData.length === 0) {
      toast.warning('There is no data to export.');
      return;
    }

    const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    const headerData = [
      ['Employee Master'],
      [`Company Name: ${companyName}`],
      [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`User Name: ${userName}`],
      []
    ];

    const transformedData = transformRowData(rowData);

    const worksheet = XLSX.utils.aoa_to_sheet(headerData);

    XLSX.utils.sheet_add_json(worksheet, transformedData, { origin: 'A6' });

    // Auto Adjust Column Width
    const colWidths = Object.keys(transformedData[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...transformedData.map(row =>
          row[key] ? row[key].toString().length : 0
        )
      );
    
      return {
        wch: Math.max(maxLength + 3, 15) // padding + minimum width
      };
    });

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Master');
    XLSX.writeFile(workbook, 'Employee_Master.xlsx');
  };

 const exportPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const reportName = "Employee Master";

  const userName =
    sessionStorage.getItem("selectedUserName") || "User";

  const now = new Date();

const currentDateTime =
  now.toLocaleDateString("en-GB").replace(/\//g, "-") +
  ", " +
  now.toLocaleTimeString("en-GB");

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Left - Report Name
  doc.setFontSize(8);
  doc.text(`Report Name: ${reportName}`, 10, 8);

  // Top Right - Company Name
  doc.text(
    `Company Name: ${companyName || ""}`,
    pageWidth - 10,
    8,
    { align: "right" }
  );

  // Headers
  const headers = columnDefs.map((col) => col.headerName);

  // Data
  const data = rowData.map((row) =>
    columnDefs.map((col) => row[col.field] ?? "-")
  );

autoTable(doc, {
  head: [headers],
  body: data,
  startY: 15,
  styles: {
    fontSize: 4,
    cellPadding: 1,
  },
  headStyles: {
    fillColor: [100, 100, 255],
    fontSize: 4,
  },
  margin: {
    top: 15,
    left: 5,
    right: 5,
    bottom: 10,
  },
  didDrawPage: function () {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);

    // Header
    doc.text(`Report Name: ${reportName}`, 10, 8);

    doc.text(
      `Company Name: ${companyName || ""}`,
      pageWidth - 10,
      8,
      { align: "right" }
    );

    // Footer
    doc.text(
      `User Name: ${userName}`,
      10,
      pageHeight - 5
    );

    doc.text(
      `Date & Time: ${currentDateTime}`,
      pageWidth - 10,
      pageHeight - 5,
      { align: "right" }
    );
  },
});

  const pageHeight = doc.internal.pageSize.getHeight();

  // Bottom Left - User Name
  doc.setFontSize(8);
  doc.text(
    `User Name: ${userName}`,
    10,
    pageHeight - 5
  );

  // Bottom Right - Date & Time
  doc.text(
    `Date & Time: ${currentDateTime}`,
    pageWidth - 10,
    pageHeight - 5,
    { align: "right" }
  );

  doc.save("Employee_Master.pdf");
};

  const defaultColDef = {
    flex: 1,
    minWidth: 130,
  };

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);

      const body = {
        column: column,
        value: departmentName
      };

      const response = await fetch(`${config.apiBaseUrl}/getEmployeesearchcriteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const fetchedData = await response.json();
        const formattedData = fetchedData.map((item) => ({
          CPRNo: item.CPRNo,
          Grade: item.Grade,
          department: item.Department,
          designation: item.Designation,
          employeeId: item["Employee ID"],
          employeeName: item["Employee Name"],
          joinDate: item["Join Date"] ? item["Join Date"].split("T")[0] : "",
          location: item.Location,
          nationality: item.Natioality || "N/A",
          passportNo: item.PassportNo || "N/A",
        }));

        setRowData(formattedData);
      } else if (response.status === 404) {
        console.log("Data Not found");
        toast.warning("Data Not found");
        setRowData([])
      } else {
        const errorResponse = await response.json();
        toast.warning(errorResponse.message || "Failed to get data");
        console.error(errorResponse.details || errorResponse.message);
      }
    } catch (error) {
      console.error("Error fetching search data:", error);
    } finally {
      setLoading(false); // Stop loading in both success and error cases
    }
  };

  const reloadGridData = () => {
    window.location.reload();
  };

  const handleRowClick = async (event) => {
    setLoading(true);
    const employeeId = event.data?.employeeId;

    const body = {
      value: employeeId
    };
  
    try {
      const response = await fetch(`${config.apiBaseUrl}/GetemployeeFullDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      if (response.ok) {
        const fetchedData = await response.json();
        navigate("/EmployeeInputInfo", {
          state: { employeeData: fetchedData },
        });
      } else if (response.status === 404) {
        console.log("Data Not found");
        toast.warning("Data Not found");
        setRowData([])
      } else {
        const errorResponse = await response.json();
        toast.warning(errorResponse.message || "Failed to insert sales data");
        console.error(errorResponse.details || errorResponse.message);
      }
    } catch (error) {
      alert("Error fetching employee details.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedRows = async () => {
    const selectedRows = gridApi.getSelectedRows();

    if (selectedRows.length === 0) {
      toast.warning("Please select atleast One Row to Delete")
      return;
    }

    const EmployeeIdToDelete = selectedRows.map((row) => row.employeeId);
    showConfirmationToast(
      "Are you sure you want to Delete the data in the selected rows?",
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`${config.apiBaseUrl}/getEmployeeDelete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              valueToDelete: EmployeeIdToDelete,
            }),
          });

          if (response.ok) {
            setTimeout(() => {
              toast.success("Data Deleted successfully")
              fetchDepartmentData();
            }, 1000);
          } else {
            const errorResponse = await response.json();
            toast.warning(errorResponse.message || "Failed to delete  ");
          }
        } catch (error) {
          console.error("Error deleting rows:", error);
          toast.error('Error Deleting Data: ' + error.message);
        } finally {
          setLoading(false);
        }

      },
      () => {
        toast.info("Data Delete cancelled.");
      }
    );
  };


  return (
    <div className="container-fluid Topnav-screen">
      {loading && <LoadingScreen />}
      <ToastContainer position="top-right" className="toast-design" theme="colored" />
      <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2">
        <div>
          <div className="d-flex justify-content-between ">
            <div className="d-flex justify-content-start ">
              <h1 className='purbut mt-3'>Employee Master</h1>
            </div>
            <div className="mobileview">
              <div className="d-flex justify-content-between">
                <div className="d-flex justify-content-start">
                  <h1 className='h1'>Employee Master</h1>
                </div>
                <div className="d-flex justify-content-end mt-1 me-5">
                  <div className="dropdown">
                    <button className="btn btn-primary dropdown-toggle p-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i className="fa-solid fa-list"></i>
                    </button>
                    <ul className="dropdown-menu p-2">
                      {["delete", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                      <li className='mb-2'>
                        <icon class="iconbutton d-flex justify-content-center" onClick={deleteSelectedRows} >
                          <i class="fa-solid fa-user-minus"></i>
                        </icon>
                      </li>
                      )}
                      {["view", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                      <li className='mb-2'>
                        <icon class="iconbutton d-flex justify-content-center" onClick={handlePrint} >
                          <i className="fa-solid fa-print" ></i>
                        </icon>
                      </li>
                      )}
                      {["excel", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                      <li className='mb-2'>
                        <icon class="iconbutton d-flex justify-content-center" onClick={handleExportToExcel}>
                          <i class="fa-solid fa-file-excel"></i>
                        </icon>
                      </li>
                      )}
                      {["pdf", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                      <li className='mb-2'>
                        <icon class="iconbutton d-flex justify-content-center" onClick={exportPDF}>
                          <i class="fa-solid fa-file-pdf"></i>
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
                 {["delete", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={deleteSelectedRows} title='Employee Delete'>
                  <i class="fa-solid fa-user-minus"></i>
                </button>
                 )}
                 {["view", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={handlePrint} title='Generate Report'>
                  <i className="fa-solid fa-print"></i>
                </button>
                 )}
                 {["excel", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={handleExportToExcel} title='Excel'>
                  <i class="fa-solid fa-file-excel"></i>
                </button>
                 )}
                 {["pdf", "all permission"].some((permission) => employeeInfoPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={exportPDF} title='Pdf'>
                  <i class="fa-solid fa-file-pdf"></i>
                </button>
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
              <label className="form-label">Department</label>
              <Select
                id="wcode"
                className="exp-input-field"
                placeholder=""
                value={selectedDepartment}
                options={filteredOptionDepartment}
                // onKeyDown={(e) => e.key === "Enter" && fetchAttendanceReportData()}
                onChange={handleChangeDepartment}
              />
            </div>
            <div className="col-12 col-md-3 mb-2">
              <label className="form-label">Columns</label>
              <Select
                id="wcode"
                className="exp-input-field"
                placeholder=""
                value={selectedColumn}
                options={filteredOptionColumn}
                onChange={handleChangeColumn}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Column Value</label>
              <input
                id="wcode"
                className="form-control exp-input-field"
                placeholder=""
                autoComplete='off'
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDepartmentData()}
              />
            </div>
            <div className="col-md-3 form-group mt-4">
              <div class="exp-form-floating">
                <div class=" d-flex  justify-content-center">
                  <div class=''>
                    <icon className=" text-dark popups-btn fs-6" onClick={fetchDepartmentData} required title="Search">
                      <i class="fa-solid fa-magnifying-glass"></i>
                    </icon>
                  </div>
                  <div>
                    <icon className=" popups-btn text-dark fs-6" onClick={reloadGridData} required title="Refresh">
                      <i class="fa-solid fa-arrow-rotate-right" ></i></icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="ag-theme-alpine mb-4" style={{ height: 455, width: '100%' }}>
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
              onRowClicked={handleRowClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCanalysis;
