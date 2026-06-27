import React, { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "./ItemDash.css";
import * as XLSX from "xlsx";
import "bootstrap/dist/css/bootstrap.min.css";
import config from "./Apiconfig";
import { ToastContainer, toast } from "react-toastify";
import DepartmentPopup from "./DepartmentPopup";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from "./LoadingScreen";
import Swal from "sweetalert2";

const QOanalysis = () => {
  // const formatDate = (isoDateString) => {
  //   const date = new Date(isoDateString);
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const day = String(date.getDate()).padStart(2,'0');
  //   return `${day}-${month}-${year}`;
  // };

  const permissions = JSON.parse(sessionStorage.getItem("permissions")) || {};
  const dailyAttendancePermission = permissions
    .filter((permission) => permission.screen_type === "DailyAttendance")
    .map((permission) => permission.permission_type.toLowerCase());

  const formatDate = (dateString) => {
    const [month, day, year] = dateString.includes("/")
      ? dateString.split("/")
      : dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  // const formatDate = (dateString) => {
  //   return new Date(dateString).toLocaleDateString('en-GB'); // Converts to DD/MM/YYYY
  // };

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
  ]);

  const [rowData, setRowData] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [departmentId, setDepartmentId] = useState("1");
  const [departmentName, setDepartmentName] = useState("VIVA");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const companyName = sessionStorage.getItem("selectedCompanyName");
  const userName = sessionStorage.getItem("selectedUserName");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const [templateList, setTemplateList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (departmentId) {
      fetchDailyAttendanceReport();
    }
  }, [departmentId]);

  const fetchDailyAttendanceReport = async () => {
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
        dept_type: departmentId,
        from_date: startDate,
        to_date: endDate,
      };

      const response = await fetch(`${config.apiBaseUrl}/Fame_atten_report`, {
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
        }));
        setRowData(newRows);
      } else if (response.status === 404) {
        console.log("Data Not found");
        toast.warning("Data Not found");
        setRowData([]);
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

    // setTimeout(() => {
    //   const headerElems = document.querySelectorAll('.ag-header-cell');

    //   headerElems.forEach((headerEl) => {
    //     headerEl.addEventListener('dblclick', () => {
    //       const colId = headerEl.getAttribute('col-id');
    //       if (colId) {
    //         handleToggleColumn(colId); // ✅ Call your function
    //       }
    //     });
    //   });
    // }, 0); // Run after DOM ready
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

        if (
          ["START_DATE", "END_DATE", "STARTDATE", "ENDDATE"].includes(col.field)
        ) {
          value = value ? formatDate(value) : "";
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
    reportWindow.document.write(
      "<html><head><title>Daily Attendance Report</title>",
    );
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
    reportWindow.document.write("<h1><u>Daily Attendance Report</u></h1>");

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
  };

  const transformRowData = (data) => {
    return data.map((row) => ({
      EMPLOYEE_NUMBER: row.EMPLOYEE_NUMBER,
      START_DATE: formatDate(row.START_DATE),
      END_DATE: formatDate(row.END_DATE),
      START_TIME: row.START_TIME,
      END_TIME: row.END_TIME,
      STATUS: row.STATUS,
      MESSAGE: row.MESSAGE,
      NAME: row.NAME,
      STARTDATE: formatDate(row.STARTDATE),
      ENDDATE: formatDate(row.ENDDATE),
      CARDID: row.CARDID,
      DAY: row.DAY,
      WORKINGHOURS: row.WORKINGHOURS,
      DELAYEDBY: row.DELAYEDBY,
      LEFTEARLY: row.LEFTEARLY,
      ADJUSTMENTINTIME: row.ADJUSTMENTINTIME,
      ADJUSTMENTOUTTIME: row.ADJUSTMENTOUTTIME,
      LOCATION_IN: row.LOCATION_IN,
      LOCATION_OUT: row.LOCATION_OUT,
    }));
  };

  const handleExportToExcel = () => {
    if (rowData.length === 0) {
      toast.warning("There is no data to export.");
      return;
    }

    const formatDate = (date) => {
      if (!date) return "";
      return new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    const headerData = [
      ["Daily Attendance Report"],
      [`Company Name: ${companyName}`],
      [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`User Name: ${userName}`],
      [],
    ];

    // const transformedData = transformRowData(rowData);

    // Columns exactly as shown in AG Grid
    const displayedColumns = gridApi
      .getAllDisplayedColumns()
      .map((col) => col.getColDef());

    // Rows exactly as shown in AG Grid
    const exportData = [];

    gridApi.forEachNodeAfterFilterAndSort((node) => {
      const row = {};

      displayedColumns.forEach((col) => {
        let value = node.data?.[col.field];

        if (
          ["START_DATE", "END_DATE", "STARTDATE", "ENDDATE"].includes(col.field)
        ) {
          value = value ? formatDate(value) : "";
        }

        row[col.headerName] = value ?? "";
      });

      exportData.push(row);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(headerData);

    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: "A6" });

    // Auto-fit column width
    const colWidths = displayedColumns.map((col) => {
      const headerLength = col.headerName.length;

      const maxDataLength = Math.max(
        ...exportData.map((row) =>
          row[col.headerName] ? row[col.headerName].toString().length : 0,
        ),
        headerLength,
      );

      return { wch: maxDataLength + 5 }; // extra padding
    });

    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Daily Attendance Report",
    );
    XLSX.writeFile(workbook, "Daily_Attendance_Report.xlsx");
  };

  const handleCustomDatestart = (e) => {
    e.preventDefault();
    setStartDate(e.target.value);
  };

  const handleCustomDateend = (e) => {
    e.preventDefault();
    setEndDate(e.target.value);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDepartment = () => {
    setOpen(true);
  };

  const handleDepartmentData = async (data) => {
    if (data && data.length > 0) {
      console.log(data);
      const [{ TypeCd, TypeDs }] = data;
      setDepartmentId(TypeCd);
      setDepartmentName(TypeDs);
    } else {
      console.error("Data is empty or undefined");
    }
  };

  const reloadGridData = () => {
    const today = new Date().toISOString().split("T")[0];

    setDepartmentId("1");
    setDepartmentName("VIVA");
    setStartDate(today);
    setEndDate(today);

    if (gridApi) {
      gridApi.deselectAll();
    }

    setColumnDefs((prev) =>
      prev.map((col) => ({
        ...col,
        hide: false,
      })),
    );

    setSearchColumn("");
    setSearchTerm("");
    setShowDropdown(false);
    setDropdownOpen(false);
    setHeaderChecked(false);

    fetchDailyAttendanceReport();
  };

  const exportPDF = () => {
    if (rowData.length === 0) {
      toast.warning("There is no data to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const reportName = "Daily Attendance Report";
    const companyNameValue =
      sessionStorage.getItem("selectedCompanyName") || companyName || "-";

    const userName =
      sessionStorage.getItem("selectedUserName") ||
      sessionStorage.getItem("selectedUserName") ||
      sessionStorage.getItem("selectedUserName") ||
      "-";

    const now = new Date();

    const currentDateTime =
      now.toLocaleDateString("en-GB").replace(/\//g, "-") +
      ", " +
      now.toLocaleTimeString("en-GB");

    // Columns exactly as shown in AG Grid
    const displayedColumns = gridApi
      .getAllDisplayedColumns()
      .map((col) => col.getColDef());

    // Headers exactly as shown in AG Grid
    const headers = displayedColumns.map((col) => col.headerName);

    // Rows exactly as shown in AG Grid
    const data = [];

    gridApi.forEachNodeAfterFilterAndSort((node) => {
      const row = displayedColumns.map((col) => {
        let value = node.data?.[col.field];

        if (
          ["START_DATE", "END_DATE", "STARTDATE", "ENDDATE"].includes(col.field)
        ) {
          value = value ? formatDate(value) : "";
        }

        return value ?? "";
      });

      data.push(row);
    });

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

        doc.text(`Company Name: ${companyName || ""}`, pageWidth - 10, 8, {
          align: "right",
        });

        // Footer
        doc.text(`User Name: ${userName}`, 10, pageHeight - 5);

        doc.text(
          `Date & Time: ${currentDateTime}`,
          pageWidth - 10,
          pageHeight - 5,
          { align: "right" },
        );
      },
    });
    doc.save("Daily_Attendance_Report.pdf");
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filtered columns based on search input
  const filteredColumns = columnDefs.filter((col) =>
    col.headerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
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
  const handleToggleColumn = (field) => {
    const updatedCols = columnDefs.map((col) =>
      col.field === field ? { ...col, hide: !col.hide } : col,
    );
    setColumnDefs(updatedCols);
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
        <Width>100</Width>
        <Position>${index}</Position>
        <Visible>${!col.hide}</Visible>
      </ColumnUserSettings>`;
    });

    gridXml += `\n  </ColUserSettings>\n</ReportUserSettings>`;

    const settings = saveFilterValues
      ? `
  <ArrayOfReportFilter xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <ReportFilter>
      <CtrlName>TempBaseType</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>BaseTypeCd</CtrlName>
      <CtrlValue>${departmentId}</CtrlValue>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>BaseTypeDs</CtrlName>
      <CtrlValue>${departmentName}</CtrlValue>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>RefDocCd</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>EmployeeDs</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>DepartmentDs</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>LocationCd</CtrlName>
      <CtrlValue />
    </ReportFilter>
    <ReportFilter>
      <CtrlName>AttDept</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>TempEmpCd</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>EmpCd</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>DepartmentCd</CtrlName>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>FromDate</CtrlName>
      <CtrlValue>${startDate}</CtrlValue>
    </ReportFilter>
    <ReportFilter>
      <CtrlName>ToDate</CtrlName>
      <CtrlValue>${endDate}</CtrlValue>
    </ReportFilter>
  </ArrayOfReportFilter>
    `.trim()
      : null;

    const grid_value = `<ArrayOfGridFilterRowSettings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" />`;

    try {
      const response = await fetch(`${config.apiBaseUrl}/TemplateInsert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formatName,
          settings: settings,
          grid_value: grid_value,
          gridcolumn_value: gridXml.trim(),
          screen: "DAR",
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Data Inserted Successfully");
        console.log(result.message);
      } else {
        console.error("Error:", result.message);
      }
    } catch (error) {
      console.error("Network error:", error);
    }

    setShowModal(false);
  };

  const fetchTemplateList = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/TemplateList`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ screen: "DAR" }),
      });

      const data = await response.json();
      setTemplateList(data);
    } catch (error) {
      console.error("Error fetching template list:", error);
    }
  };

  // useEffect la call
  useEffect(() => {
    const savedFilter = localStorage.getItem("DARFilterSettings");
    const savedGrid = localStorage.getItem("DARGridFormat");

    if (savedFilter) {
      applyFilterSettings(savedFilter);
    }
    if (savedGrid) {
      applyColumnSettings(savedGrid);
    }

    fetchTemplateList();
  }, []);

  const handleTemplateApply = async (name) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/FetchTemplate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen: "DAR", name }),
      });

      const data = await response.json();
      const gridSettings = data[0]?.GridColumnSettings;
      const filterSettings = data[0]?.Settings;

      if (gridSettings) {
        localStorage.setItem("DARGridFormat", gridSettings);
        applyColumnSettings(gridSettings);
      }

      if (filterSettings) {
        localStorage.setItem("DARFilterSettings", filterSettings);
        applyFilterSettings(filterSettings);
      }
    } catch (err) {
      console.error("Error applying template:", err);
    }
  };

  const applyFilterSettings = (xmlString) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    const filters = xml.getElementsByTagName("ReportFilter");

    let tempFilter = {};
    Array.from(filters).forEach((filter) => {
      const key = filter.getElementsByTagName("CtrlName")[0]?.textContent;
      const value = filter.getElementsByTagName("CtrlValue")[0]?.textContent;
      tempFilter[key] = value;
    });

    if (tempFilter?.FromDate) setStartDate(tempFilter.FromDate);
    if (tempFilter?.ToDate) setEndDate(tempFilter.ToDate);
    if (tempFilter?.BaseTypeCd) setDepartmentId(tempFilter.BaseTypeCd);
    if (tempFilter?.BaseTypeDs) setDepartmentName(tempFilter.BaseTypeDs);
  };

  const applyColumnSettings = (xmlString) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    const columns = xml.getElementsByTagName("ColumnUserSettings");

    const updated = columnDefs.map((col) => {
      const matched = Array.from(columns).find(
        (c) => c.getElementsByTagName("Key")[0]?.textContent === col.field,
      );

      if (matched) {
        const visibleText =
          matched.getElementsByTagName("Visible")[0]?.textContent;
        const isVisible = visibleText?.toLowerCase() === "true";
        return { ...col, hide: !isVisible };
      }

      return col;
    });

    setColumnDefs(updated);
  };

  const handleHeaderCheckboxChange = () => {
    const newChecked = !headerChecked;
    setHeaderChecked(newChecked);

    // apply only to filtered columns
    const updated = columnDefs.map((col) =>
      filteredColumns.some((fc) => fc.field === col.field)
        ? { ...col, hide: !newChecked } // if header checked => show all, else hide all
        : col,
    );

    setColumnDefs(updated);
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
              <h1 className="purbut mt-3">Daily Attendance Report</h1>
            </div>
            <div className="mobileview">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex justify-content-start">
                  <h1 className="h1">Daily Attendance Report</h1>
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

                    <ul
                      className="dropdown-menu dropdown-menu-end text-center p-2"
                      style={{ minWidth: "200px" }}
                    >
                      <li className="d-flex justify-content-around border-bottom pb-2 mb-2">
                        <a onClick={() => setShowModal(true)} title="Save">
                          <i className="fa-solid fa-floppy-disk"></i>
                        </a>
                        {["view", "all permission"].some((permission) =>
                          dailyAttendancePermission.includes(permission),
                        ) && (
                          <a onClick={handlePrint} title="Print">
                            <i className="fa-solid fa-print"></i>
                          </a>
                        )}
                        {["excel", "all permission"].some((permission) =>
                          dailyAttendancePermission.includes(permission),
                        ) && (
                          <a onClick={handleExportToExcel} title="Export Excel">
                            <i className="fa-solid fa-file-excel text-success"></i>
                          </a>
                        )}
                        {["pdf", "all permission"].some((permission) =>
                          dailyAttendancePermission.includes(permission),
                        ) && (
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
                                  onClick={() =>
                                    handleTemplateApply(template.ControlName)
                                  }
                                >
                                  <a className="d-block text-primary text-decoration-underline px-2 py-1">
                                    {template.ControlName}
                                  </a>
                                </li>
                              ))
                            ) : (
                              <li className="text-muted small py-2">
                                No templates found
                              </li>
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
                {["view", "all permission"].some((permission) =>
                  dailyAttendancePermission.includes(permission),
                ) && (
                  <button
                    className="btn btn-dark mt-3 mb-3 rounded-3"
                    onClick={handlePrint}
                    title="Generate Report"
                  >
                    <i className="fa-solid fa-print"></i>
                  </button>
                )}
                {["excel", "all permission"].some((permission) =>
                  dailyAttendancePermission.includes(permission),
                ) && (
                  <button
                    className="btn btn-dark mt-3 mb-3 rounded-3"
                    onClick={handleExportToExcel}
                    title="Excel"
                  >
                    <i class="fa-solid fa-file-excel"></i>
                  </button>
                )}
                {["pdf", "all permission"].some((permission) =>
                  dailyAttendancePermission.includes(permission),
                ) && (
                  <button
                    className="btn btn-dark mt-3 mb-3 rounded-3"
                    onClick={exportPDF}
                    title="Pdf"
                  >
                    <i class="fa-solid fa-file-pdf"></i>
                  </button>
                )}
                <div className="position-relative">
                  <button
                    className="btn btn-dark mt-3 mb-3 rounded-3"
                    onClick={() => {
                      fetchTemplateList();
                      setShowDropdown((prev) => !prev);
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
                              template.ControlName.toLowerCase().includes(
                                searchColumn.toLowerCase(),
                              ),
                            )
                            .map((template, index) => (
                              <li
                                key={index}
                                className="dropdown-item p-0"
                                onClick={() =>
                                  handleTemplateApply(template.ControlName)
                                }
                                style={{ cursor: "pointer" }}
                              >
                                <a className="d-block text-primary text-decoration-underline px-2 py-1">
                                  {template.ControlName}
                                </a>
                              </li>
                            ))}
                          {templateList.filter((template) =>
                            template.ControlName.toLowerCase().includes(
                              searchColumn.toLowerCase(),
                            ),
                          ).length === 0 && (
                            <li className="text-muted px-2 py-1">
                              No results found
                            </li>
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
      </div>
      <div className="shadow-lg p-1 bg-body-tertiary rounded mb-2 mt-2">
        <div className="row ms-4 mt-3 mb-3 me-4 align-items-end">
          <div className="col-md-2 mb-2">
            <label className="form-label">Department Id</label>
            <div className="d-flex position-relative">
              <input
                id="deptId"
                className="form-control exp-input-field"
                value={departmentId}
                autoComplete="off"
                onKeyDown={(e) =>
                  e.key === "Enter" && fetchDailyAttendanceReport()
                }
                // onChange={(e) => setDepartmentId(e.target.value)}
                onChange={(e) => {
                  const value = e.target.value;
                  setDepartmentId(value);

                  if (value.trim() === "") {
                    setDepartmentName("");
                  }
                }}
              />
              <span
                className="position-absolute end-0 me-2 mt-2 text-secondary"
                style={{ cursor: "pointer" }}
                onClick={handleDepartment}
                title="Search Department"
              >
                <i className="fa fa-search"></i>
              </span>
            </div>
          </div>

          <div className="col-md-2 mb-2">
            <label className="form-label">Department Name</label>
            <input
              id="deptName"
              className="form-control exp-input-field"
              value={departmentName}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchDailyAttendanceReport()
              }
              readOnly
            />
          </div>

          <div className="col-md-2 mb-2">
            <label className="form-label">From</label>
            <input
              type="date"
              className="form-control exp-input-field"
              name="from"
              value={startDate}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchDailyAttendanceReport()
              }
              onChange={handleCustomDatestart}
            />
          </div>

          <div className="col-md-2 mb-2">
            <label className="form-label">To</label>
            <input
              type="date"
              className="form-control exp-input-field"
              name="to"
              value={endDate}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchDailyAttendanceReport()
              }
              onChange={handleCustomDateend}
            />
          </div>

          <div className="col-md-2 mb-2 d-flex justify-content-start">
            <span
              className="text-dark popups-btn fs-5"
              onClick={fetchDailyAttendanceReport}
              title="Search"
              style={{ cursor: "pointer" }}
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <span
              className="text-dark popups-btn fs-5"
              onClick={reloadGridData}
              title="Refresh"
              style={{ cursor: "pointer" }}
            >
              <i className="fa-solid fa-arrow-rotate-right"></i>
            </span>
          </div>
        </div>

        <div>
          <DepartmentPopup
            open={open}
            handleClose={handleClose}
            handleDepartmentData={handleDepartmentData}
          />
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
                      filteredColumns.every((col) => !col.hide)
                    }
                    indeterminate={
                      filteredColumns.some((col) => !col.hide) &&
                      !filteredColumns.every((col) => !col.hide)
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
                  <div
                    style={{
                      textAlign: "center",
                      color: "#888",
                      padding: "10px",
                    }}
                  >
                    No matching columns
                  </div>
                ) : (
                  filteredColumns.map((col) => (
                    <div
                      key={col.field}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
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
        <div className="ag-theme-alpine" style={{ height: 450, width: "100%" }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            pagination={true}
            paginationAutoPageSize={true}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}
            rowHeight={30}
            headerHeight={30}
            rowSelection="multiple"
          />
        </div>
      </div>
      {showModal && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "8px",
              width: "400px",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
            }}
          >
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
                  if (!formatName || formatName.trim() === "") {
                    Swal.fire({
                      icon: "error",
                      title: "Format Name Required",
                      text: "Please enter a format name",
                    });
                    return;
                  }

                  const alreadyExists = templateList.some(
                    (template) =>
                      template.ControlName.toLowerCase().trim() ===
                      formatName.toLowerCase().trim(),
                  );

                  if (alreadyExists) {
                    const result = await Swal.fire({
                      title: "Are you sure?",
                      text: `A template named "${formatName}" already exists. Do you want to overwrite it?`,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: "Yes, overwrite it",
                      cancelButtonText: "No, cancel",
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
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowModal(false);
                  setFormatName("");
                  setSaveFilterValues(false);
                }}
              >
                <i className="fa fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QOanalysis;
