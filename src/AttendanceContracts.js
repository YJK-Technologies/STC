import React, { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './ItemDash.css';
import * as XLSX from 'xlsx';
import "bootstrap/dist/css/bootstrap.min.css";
import config from './Apiconfig';
import { ToastContainer, toast } from "react-toastify";
import EmployeePopup from './EmployeePopup';
import ContractorPopup from './ContractorPopup';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from './LoadingScreen';
import Swal from 'sweetalert2';

const PurchaseOrderAnalysis = () => {
  // const formatDate = (isoDateString) => {
  //   const date = new Date(isoDateString);
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const day = String(date.getDate()).padStart(2, '0');
  //   return `${day}-${month}-${year}`;
  // };

  const permissions = JSON.parse(sessionStorage.getItem("permissions")) || {};
  const attenContractsPermission = permissions
    .filter((permission) => permission.screen_type === "AttenContracts")
    .map((permission) => permission.permission_type.toLowerCase());

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB'); // Converts to DD/MM/YYYY
  };

  const [headerChecked, setHeaderChecked] = useState(false);
  const [searchColumn, setSearchColumn] = useState("");

  const [columnDefs, setColumnDefs] = useState([
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerName: "EMPLOYEE_NUMBER",
      field: "EMPLOYEE_NUMBER",
    },
    { headerName: "START_DATE", field: "START_DATE" },
    { headerName: "END_DATE", field: "END_DATE" },
    { headerName: "START_TIME", field: "START_TIME" },
    { headerName: "END_TIME", field: "END_TIME" },
    { headerName: "STATUS", field: "STATUS" },
    { headerName: "MESSAGE", field: "MESSAGE" },
    { headerName: "NAME", field: "NAME" },
    { headerName: "STARTDATE", field: "STARTDATE" },
    { headerName: "ENDDATE", field: "ENDDATE" },
    { headerName: "CARDID", field: "CARDID" },
    { headerName: "DAY", field: "DAY" },
    { headerName: "WORKINGHOURS", field: "WORKINGHOURS" },
    { headerName: "DELAYEDBY", field: "DELAYEDBY" },
    { headerName: "LEFTEARLY", field: "LEFTEARLY" },
    { headerName: "ADJUSTMENTINTIME", field: "ADJUSTMENTINTIME" },
    { headerName: "ADJUSTMENTOUTTIME", field: "ADJUSTMENTOUTTIME" },
    { headerName: "LOCATION_IN", field: "LOCATION_IN" },
    { headerName: "LOCATION_OUT", field: "LOCATION_OUT" },
    { headerName: "CONTACTORNAME", field: "ContractorName" },
  ]);

  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [employee, setEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [contractorName, setContractorName] = useState("");
  const companyName = sessionStorage.getItem('selectedCompanyName');
  const userName = sessionStorage.getItem('selectedUserName');
  const [open, setOpen] = React.useState(false);
  const [open1, setOpen1] = React.useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [templateList, setTemplateList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCustomDatestart = (e) => {
    e.preventDefault();
    setStartDate(e.target.value);
  };

  const handleCustomDateend = (e) => {
    e.preventDefault();
    setEndDate(e.target.value);
  };

  const handleEmployee = () => {
    setOpen(true);
  };

  const handleContractor = () => {
    setOpen1(true);
  };

  const handleClose = () => {
    setOpen(false);
    setOpen1(false);
  };

  const fetchAttendanceSummaryData = async () => {
    if (!startDate && !endDate) {
      toast.warning("Please select From Date and To Date");
      return;
    }

    if (startDate && !endDate) {
      toast.warning("Please select To Date");
      return;
    }

    if (!startDate && endDate) {
      toast.warning("Please select From Date");
      return;
    }

    const from = new Date(startDate);
    const to = new Date(endDate);

    if (from > to) {
      toast.warning("From Date cannot be greater than To Date");
      return;
    }
    
    try {
      setLoading(true);

      const body = {
        from_date: startDate,
        to_date: endDate,
        emp_id: employee,
        contractor_name: contractorName,
      };

      const response = await fetch(`${config.apiBaseUrl}/Fame_atten_contract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const fetchedData = await response.json();
        const newRows = fetchedData.map((matchedItem) => ({
          START_DATE: formatDate(matchedItem.START_DATE),
          END_DATE: formatDate(matchedItem.END_DATE),
          STARTDATE: formatDate(matchedItem.STARTDATE),
          ENDDATE: formatDate(matchedItem.ENDDATE),
          EMPLOYEE_NUMBER: matchedItem.EMPLOYEE_NUMBER,
          START_TIME: matchedItem.START_TIME,
          END_TIME: matchedItem.END_TIME,
          STATUS: matchedItem.STATUS,
          MESSAGE: matchedItem.MESSAGE,
          NAME: matchedItem.NAME,
          CARDID: matchedItem.CARDID,
          DAY: matchedItem.DAY,
          WORKINGHOURS: matchedItem.WORKINGHOURS,
          DELAYEDBY: matchedItem.DELAYEDBY,
          LEFTEARLY: matchedItem.LEFTEARLY,
          ADJUSTMENTINTIME: matchedItem.ADJUSTMENTINTIME,
          ADJUSTMENTOUTTIME: matchedItem.ADJUSTMENTOUTTIME,
          LOCATION_IN: matchedItem.LOCATION_IN,
          LOCATION_OUT: matchedItem.LOCATION_OUT,
          ContractorName: matchedItem.ContractorName,
        }));
        setRowData(newRows);
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

  const onGridReady = (params) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  const handlePrint = () => {
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one row to generate a report");
      return;
    }

    const reportData = selectedRows.map((row) => {
      return {
        "EMPLOYEE_NUMBER": row.EMPLOYEE_NUMBER,
        "START_DATE": row.START_DATE,
        "END_DATE": row.END_DATE,
        "START_TIME": row.START_TIME,
        "END_TIME": row.END_TIME,
        "STATUS": row.STATUS,
        "MESSAGE": row.MESSAGE,
        "NAME": row.NAME,
        "STARTDATE": row.STARTDATE,
        "ENDDATE": row.ENDDATE,
        "CARDID": row.CARDID,
        "DAY": row.DAY,
        "WORKINGHOURS": row.WORKINGHOURS,
        "DELAYEDBY": row.DELAYEDBY,
        "LEFTEARLY": row.LEFTEARLY,
        "ADJUSTMENTINTIME": row.ADJUSTMENTINTIME,
        "ADJUSTMENTOUTTIME": row.ADJUSTMENTOUTTIME,
        "LOCATION_IN": row.LOCATION_IN,
        "LOCATION_OUT": row.LOCATION_OUT,
        "CONTACTORNAME": row.ContractorName,
      };
    });

    const reportWindow = window.open("", "_blank");
    reportWindow.document.write("<html><head><title>Attendance Summary for Contracts</title>");
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
    reportWindow.document.write("<h1><u>Attendance Summary for Contracts</u></h1>");

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
      "EMPLOYEE_NUMBER": row.EMPLOYEE_NUMBER,
      "START_DATE": formatDate(row.START_DATE),
      "END_DATE": formatDate(row.END_DATE),
      "START_TIME": row.START_TIME,
      "END_TIME": row.END_TIME,
      "STATUS": row.STATUS,
      "MESSAGE": row.MESSAGE,
      "NAME": row.NAME,
      "STARTDATE": formatDate(row.STARTDATE),
      "ENDDATE": formatDate(row.ENDDATE),
      "CARDID": row.CARDID,
      "DAY": row.DAY,
      "WORKINGHOURS": row.WORKINGHOURS,
      "DELAYEDBY": row.DELAYEDBY,
      "LEFTEARLY": row.LEFTEARLY,
      "ADJUSTMENTINTIME": row.ADJUSTMENTINTIME,
      "ADJUSTMENTOUTTIME": row.ADJUSTMENTOUTTIME,
      "LOCATION_IN": row.LOCATION_IN,
      "LOCATION_OUT": row.LOCATION_OUT,
      "CONTACTORNAME": row.ContractorName,
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
      ['Attendance Summary Contracts'],
      [`Company Name: ${companyName}`],
      [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`User Name: ${userName}`],
      []
    ];

    const transformedData = transformRowData(rowData);

    // Export only visible columns
    const visibleColumns = columnDefs.filter(col => !col.hide);

    const exportData = transformedData.map(row => {
      const filteredRow = {};
    
      visibleColumns.forEach(col => {
        filteredRow[col.headerName] = row[col.field];
      });
    
      return filteredRow;
    });

    const worksheet = XLSX.utils.aoa_to_sheet(headerData);

    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: 'A6' });

    // Auto-fit column width
    const colWidths = visibleColumns.map(col => {
      const headerLength = col.headerName.length;
    
      const maxDataLength = Math.max(
        ...exportData.map(row =>
          row[col.headerName]
            ? row[col.headerName].toString().length
            : 0
        ),
        headerLength
      );
    
      return { wch: maxDataLength + 5 }; // extra padding
    });

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary Contracts');
    XLSX.writeFile(workbook, 'Attendance_Summary_Contracts.xlsx');
  };

  const handleEmployeeData = async (data) => {
    if (data && data.length > 0) {
      console.log(data)
      const [{ Empcd, Empds }] = data;
      setEmployee(Empcd);
      setEmployeeName(Empds);
    } else {
      console.error('Data is empty or undefined');
    }
  };

  const handleContractorData = async (data) => {
    if (data && data.length > 0) {
      console.log(data)
      const [{ contractorname }] = data;
      setContractorName(contractorname);
    } else {
      console.error('Data is empty or undefined');
    }
  };

  const reloadGridData = () => {
    window.location.reload();
  };

const exportPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape", // Landscape mode
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(6); // Very Small Font

  const reportName = "Attendance Summary Contracts";
  const userName =
    sessionStorage.getItem("selectedUserName") ||
    sessionStorage.getItem("selectedUserName") ||
    "User";

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
    `Company Name: ${companyName}`,
    pageWidth - 10,
    8,
    { align: "right" }
  );

// Only visible columns
const visibleColumns = columnDefs.filter(col => !col.hide);

// Extract headers from visible columns only
const headers = visibleColumns.map(col => col.headerName);

// Extract data from visible columns only
const data = rowData.map(row =>
  visibleColumns.map(col => row[col.field] || "-")
);
  // AutoTable Configuration
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

  doc.save("Attendance_Summary_Contracts.pdf");
};

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filtered columns based on search input
  const filteredColumns = columnDefs.filter(col =>
    col.headerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // const handleSaveColumns = async () => {
  //   const xml = xmljs.js2xml(
  //     {
  //       columns: {
  //         column: selectedCols.map(col => ({ _text: col }))
  //       }
  //     },
  //     { compact: true, ignoreComment: true, spaces: 4 }
  //   );

  //   try {
  //     await axios.post("http://localhost:5000/saveColumnSettings", { xml });
  //     alert("Column settings saved successfully!");
  //   } catch (err) {
  //     console.error("Saving failed:", err);
  //   }
  // };

  // Toggle column visibility from dropdown
  const handleToggleColumn = field => {
    const updatedCols = columnDefs.map(col =>
      col.field === field ? { ...col, hide: !col.hide } : col
    );
    setColumnDefs(updatedCols);
  };

  const handleHeaderCheckboxChange = () => {
    const newChecked = !headerChecked;
    setHeaderChecked(newChecked);

    // apply only to filtered columns
    const updated = columnDefs.map(col =>
      filteredColumns.some(fc => fc.field === col.field)
        ? { ...col, hide: !newChecked } // if header checked => show all, else hide all
        : col
    );

    setColumnDefs(updated);
  };

  const [showModal, setShowModal] = useState(false);
  const [formatName, setFormatName] = useState("");
  const [saveFilterValues, setSaveFilterValues] = useState(false);

  const handleSaveColumns = async () => {
    let gridXml = `<ReportUserSettings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n  <ColUserSettings>`;

    columnDefs.forEach((col, index) => {
      gridXml += `
          <ColumnUserSettings>
            <Key>${col.field}</Key>
            <Width>${col.width || 100}</Width>
            <Position>${index}</Position>
            <Visible>${!col.hide}</Visible>
          </ColumnUserSettings>`;
    });

    gridXml += `\n  </ColUserSettings>\n</ReportUserSettings>`;

    // Create separate 'settings' in <ReportFilter> format (used for applying filters later)
    const settings = saveFilterValues
      ? `
      <ArrayOfReportFilter xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <ReportFilter>
          <CtrlName>Employee</CtrlName>
          <CtrlValue>${employee}</CtrlValue>
        </ReportFilter>
        <ReportFilter>
          <CtrlName>Empds</CtrlName>
          <CtrlValue>${employeeName}</CtrlValue>
        </ReportFilter>
        <ReportFilter>
          <CtrlName>ContractorName</CtrlName>
          <CtrlValue>${contractorName}</CtrlValue>
        </ReportFilter>
      </ArrayOfReportFilter>`.trim()
      : null;

    const gridValueXml = `<ArrayOfGridFilterRowSettings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" />`;

    try {
      const response = await fetch(`${config.apiBaseUrl}/TemplateInsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formatName,
          settings: settings,
          grid_value: gridValueXml,
          gridcolumn_value: gridXml.trim(),
          screen: "ASRC"
        })
      });

      if (response.ok) {
        toast.success("Data Inserted Successfully");
        console.log("XML sent successfully");
      } else {
        console.error("Failed to send XML:", response.statusText);
      }
    } catch (error) {
      console.error("Error sending XML:", error);
    }

    setShowModal(false);
  };

  const fetchTemplateList = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/TemplateList`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ screen: "ASRC" }),
      });

      const data = await response.json();
      setTemplateList(data);
    } catch (error) {
      console.error('Error fetching template list:', error);
    }
  };

  const handleTemplateApply = async (name) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/FetchTemplate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen: "ASRC", name }),
      });

      const data = await response.json();
      const gridSettings = data[0]?.GridColumnSettings;
      const filterSettings = data[0]?.Settings;

      if (gridSettings) {
        localStorage.setItem('ASRCGridFormat', gridSettings);
        applyColumnSettings(gridSettings);
      }

      if (filterSettings) {
        localStorage.setItem('ASRCFilterSettings', filterSettings);
        applyFilterSettings(filterSettings);
      }
    } catch (err) {
      console.error("Error applying template:", err);
    }
  };

  useEffect(() => {
    const savedFilter = localStorage.getItem('ASRCFilterSettings');
    const savedGrid = localStorage.getItem('ASRCGridFormat');

    if (savedFilter) {
      applyFilterSettings(savedFilter);
    }
    if (savedGrid) {
      applyColumnSettings(savedGrid);
    }

    fetchTemplateList();
  }, []);


  const applyFilterSettings = (xmlString) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const filters = xml.getElementsByTagName('ReportFilter');

    let tempFilter = {};
    Array.from(filters).forEach((filter) => {
      const key = filter.getElementsByTagName('CtrlName')[0]?.textContent;
      const value = filter.getElementsByTagName('CtrlValue')[0]?.textContent;
      tempFilter[key] = value;
    });

    if (tempFilter?.Employee) setEmployee(tempFilter.Employee);
    if (tempFilter?.Empds) setEmployeeName(tempFilter.Empds);
    if (tempFilter?.ContractorName) setContractorName(tempFilter.ContractorName);
  };

  const applyColumnSettings = (xmlString) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const columns = xml.getElementsByTagName('ColumnUserSettings');

    const updated = columnDefs.map((col) => {
      const matched = Array.from(columns).find(
        (c) => c.getElementsByTagName('Key')[0]?.textContent === col.field
      );

      if (matched) {
        const visibleText = matched.getElementsByTagName('Visible')[0]?.textContent;
        const isVisible = visibleText?.toLowerCase() === 'true';
        return { ...col, hide: !isVisible };
      }

      return col;
    });

    setColumnDefs(updated);
  };


  return (
    <div className="container-fluid Topnav-screen">
      {loading && <LoadingScreen />}
      <ToastContainer position="top-right" className="toast-design" theme="colored" />
      <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2">
        <div className="d-flex justify-content-between ">
          <h1 className='purbut mt-3'>Attendance Summary for Contracts</h1>
          <div className="mobileview">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex justify-content-start">
                <h1 className="h1">Attendance Summary for Contracts</h1>
              </div>
              <div className="d-flex justify-content-end mt-4 me-3">
                <div className="dropdown">
                  <button
                    className="btn btn-primary dropdown-toggle p-2"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="fa-solid fa-list"></i>
                  </button>

                  <ul className="dropdown-menu dropdown-menu-end text-center p-2" style={{ minWidth: "200px" }}>

                    <li className="d-flex justify-content-around border-bottom pb-2 mb-2">
                      <a onClick={() => setShowModal(true)} title="Save">
                        <i className="fa-solid fa-floppy-disk"></i>
                      </a>
                      {["view", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                        <a onClick={handlePrint} title="Print">
                          <i className="fa-solid fa-print"></i>
                        </a>
                      )}
                      {["excel", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                        <a onClick={handleExportToExcel} title="Export Excel">
                          <i className="fa-solid fa-file-excel text-success"></i>
                        </a>
                      )}
                      {["pdf", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                        <a onClick={exportPDF} title="Export PDF">
                          <i className="fa-solid fa-file-pdf text-danger"></i>
                        </a>
                      )}
                    </li>

                    <li>
                      <div
                        style={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          overflowX: "hidden",
                        }}
                      >
                        <ul className="list-unstyled m-0">
                          {templateList.length > 0 ? (
                            templateList.map((template, index) => (
                              <li
                                key={index}
                                className="dropdown-item p-0"
                                onClick={() => handleTemplateApply(template.ControlName)}
                              >
                                <a
                                  className="d-block text-primary text-decoration-underline px-2 py-1"
                                >
                                  {template.ControlName}
                                </a>
                              </li>
                            ))
                          ) : (
                            <li className="text-muted small py-2">No templates found</li>
                          )}
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="purbut">
            <div className="d-flex justify-content-end me-5">
              <button
                className="btn btn-dark mt-3 mb-3 rounded-3"
                title="Save Columns"
                onClick={() => setShowModal(true)}
              >
                <i className="fa-solid fa-floppy-disk"></i>
              </button>
              {["view", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={handlePrint} title='Generate Report'>
                  <i className="fa-solid fa-print"></i>
                </button>
              )}
              {["excel", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                <button class="btn btn-dark  mt-3 mb-3  rounded-3" onClick={handleExportToExcel} title='Excel'>
                  <i class="fa-solid fa-file-excel"></i>
                </button>
              )}
              {["pdf", "all permission"].some((permission) => attenContractsPermission.includes(permission)) && (
                <button className="btn btn-dark mt-3 mb-3 rounded-3" onClick={exportPDF} title='Pdf'>
                  <i class="fa-solid fa-file-pdf"></i>
                </button>
              )}
              <div className="position-relative">
                <button
                  className="btn btn-dark mt-3 mb-3 rounded-3"
                  onClick={() => {
                    fetchTemplateList();
                    setShowDropdown(prev => !prev);
                  }}
                  title="Show Templates"
                >
                  <i className="fa-solid fa-list"></i>
                </button>

                {showDropdown && (
                  <div
                    className="dropdown-menu show position-absolute mt-2 p-0"
                    style={{
                      right: 0,
                      zIndex: 10,
                      minWidth: "200px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px",
                        borderBottom: "1px solid #eee",
                        background: "#f9f9f9",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchColumn}
                        onChange={(e) => setSearchColumn(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "5px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        overflowX: "hidden",
                        padding: "5px 0",
                      }}
                    >
                      <ul className="list-unstyled m-0">
                        {templateList
                          .filter((template) =>
                            template.ControlName.toLowerCase().includes(searchColumn.toLowerCase())
                          )
                          .map((template, index) => (
                            <li
                              key={index}
                              className="dropdown-item p-0"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleTemplateApply(template.ControlName)}
                            >
                              <a
                                className="d-block text-primary text-decoration-underline px-2 py-1"
                              >
                                {template.ControlName}
                              </a>
                            </li>
                          ))}
                        {templateList.filter((template) =>
                          template.ControlName.toLowerCase().includes(searchColumn.toLowerCase())
                        ).length === 0 && (
                            <li className="text-muted px-2 py-1">No results found</li>
                          )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2 mt-2">
        <div className="row ms-4 mt-3 mb-3 me-4">
          <div className='col-md-5 mb-3'>
            <div className="row">
              <div className="col-md-6 mb-2">
                <label className="form-label">From</label>
                <input
                  type="date"
                  className="form-control border-secondary"
                  name="from"
                  value={startDate}
                  onKeyDown={(e) => e.key === "Enter" && fetchAttendanceSummaryData()}
                  onChange={handleCustomDatestart}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">To</label>
                <input
                  type="date"
                  className="form-control border-secondary"
                  name="to"
                  value={endDate}
                  onKeyDown={(e) => e.key === "Enter" && fetchAttendanceSummaryData()}
                  onChange={handleCustomDateend}
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3  mb-2">
            <label className="form-label">Employee</label>
            <div class="d-flex justify-content-end">
              <input
                id="transactionNumber"
                className="exp-input-field form-control justify-content-start"
                type="text"
                placeholder=""
                required
                value={employee}
                onKeyDown={(e) => e.key === "Enter" && fetchAttendanceSummaryData()}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmployee(value);

                  if (value.trim() === "") {
                    setEmployeeName("");
                  }
                }}
                autoComplete='off'
              />
              <div className='position-absolute mt-1 me-2'>
                <span className="icon searchIcon"
                  onClick={handleEmployee}>
                  <i class="fa fa-search"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3 mb-2">
            <label className="form-label">Employee Name</label>
            <input
              id="wcode"
              className="form-control exp-input-field"
              placeholder=""
              autoComplete='off'
              value={employeeName}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Contractor Name</label>
            <div class="d-flex justify-content-end">
              <input
                id="transactionNumber"
                className="exp-input-field form-control justify-content-start"
                type="text"
                placeholder=""
                required
                value={contractorName}
                onKeyDown={(e) => e.key === "Enter" && fetchAttendanceSummaryData()}
                onChange={(e) => setContractorName(e.target.value)}
                autoComplete='off'
              />
              <div className='position-absolute mt-1 me-2'>
                <span className="icon searchIcon"
                  onClick={handleContractor}>
                  <i class="fa fa-search"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-3 form-group mt-4">
            <div class="exp-form-floating">
              <div class=" d-flex  justify-content-center">
                <div class=''>
                  <icon className=" text-dark popups-btn fs-6" onClick={fetchAttendanceSummaryData} required title="Search">
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
        <div>
          <EmployeePopup open={open} handleClose={handleClose} handleEmployeeData={handleEmployeeData} />
          <ContractorPopup open={open1} handleClose={handleClose} handleContractorData={handleContractorData} />
        </div>

        <div className="mb-2 ms-4" ref={dropdownRef}>
          <button
            className="btn btn-secondary"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            Select Columns ▼
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                background: "white",
                border: "1px solid #ccc",
                boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
                width: "220px",
                zIndex: 1000,
                marginTop: "5px",
              }}
            >
              {/* Header Section */}
              <div
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  background: "#f9f9f9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {/* Header Checkbox */}
                  <input
                    type="checkbox"
                    checked={
                      filteredColumns.length > 0 &&
                      filteredColumns.every(col => !col.hide)
                    }
                    indeterminate={
                      filteredColumns.some(col => !col.hide) &&
                      !filteredColumns.every(col => !col.hide)
                    }
                    onChange={handleHeaderCheckboxChange}
                  />

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Search Columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "5px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>

              {/* Scrollable list */}
              <div
                style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                  padding: "10px",
                }}
              >
                {filteredColumns.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#888", padding: "10px" }}>
                    No matching columns
                  </div>
                ) : (
                  filteredColumns.map((col) => (
                    <div
                      key={col.field}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <input
                        type="checkbox"
                        checked={!col.hide}
                        onChange={() => handleToggleColumn(col.field)}
                      />
                      <label>{col.headerName}</label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ag-theme-alpine mb-4" style={{ height: 455, width: '100%' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            pagination={true}
            paginationAutoPageSize={true}
            onGridReady={onGridReady}
            rowHeight={30}
            headerHeight={30}
            rowSelection="multiple"
          />
        </div>
      </div>
      {showModal && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          background: "rgba(0, 0, 0, 0.4)",
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: "1050",
        }}>
          <div style={{
            background: "white",
            padding: "25px",
            borderRadius: "8px",
            width: "400px",
            boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)"
          }}>
            <h5 className="mb-3">Save Column Settings</h5>

            <label className="form-label">Format Name</label>
            <input
              type="text"
              value={formatName}
              className="form-control mb-3"
              onChange={(e) => setFormatName(e.target.value)}
            />

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={saveFilterValues}
                onChange={() => setSaveFilterValues(!saveFilterValues)}
                id="saveFilters"
              />
              <label className="form-check-label" htmlFor="saveFilters">
                Save Filter Values
              </label>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-success"
                onClick={async () => {
                  const alreadyExists = templateList.some(
                    (template) =>
                      template.ControlName.toLowerCase().trim() === formatName.toLowerCase().trim()
                  );

                  if (alreadyExists) {
                    const result = await Swal.fire({
                      title: 'Are you sure?',
                      text: `A template named "${formatName}" already exists. Do you want to overwrite it?`,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Yes, overwrite it',
                      cancelButtonText: 'No, cancel',
                    });

                    if (result.isConfirmed) {
                      handleSaveColumns();
                      setFormatName("");
                      setSaveFilterValues(false);
                    }
                  } else {
                    handleSaveColumns();
                    setFormatName("");
                    setSaveFilterValues(false);
                  }
                }}
              >
                <i className="fa fa-check"></i> Save
              </button>
              <button className="btn btn-danger" onClick={() => {
                setShowModal(false);
                setFormatName("");
                setSaveFilterValues(false);
              }}>
                <i className="fa fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderAnalysis;
