import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BsChevronRight, BsChevronDown } from "react-icons/bs";
import { CardText } from "react-bootstrap-icons";
import "./SideBar.css";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [mastersCollapsed, setMastersCollapsed] = useState(false);
  const [reportCollapsed, setReportCollapsed] = useState(false);
  const location = useLocation();
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleAdminCollapse = () => {
    setAdminCollapsed(!adminCollapsed);
    setMastersCollapsed(false);
    setReportCollapsed(false);
  };

  const toggleMastersCollapse = () => {
    setMastersCollapsed(!mastersCollapsed);
    setAdminCollapsed(false);
    setReportCollapsed(false);
  };

  const toggleReportCollapse = () => {
    setReportCollapsed(!reportCollapsed);
    setAdminCollapsed(false);
    setMastersCollapsed(false);
  };

  // Fetch permissions from session storage
  const permissionsJSON = sessionStorage.getItem("permissions");
  const permissions = permissionsJSON ? JSON.parse(permissionsJSON) : [];
  const screenType = Array.isArray(permissions)
    ? permissions.map((permission) =>
      permission.screen_type.replace(/\s+/g, "")
    )
    : [];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-menu mt-2" id="">
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {collapsed ? <BsChevronDown /> : <BsChevronRight />}
        </div>

        <div className=" mt-5"></div>
        <div className="menu-item" onClick={toggleAdminCollapse} title="Admin">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            class="bi bi-person-vcard me-2 Admin-font"
            viewBox="0 0 16 16"
          >
            <path d="M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m4-2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5M9 8a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4A.5.5 0 0 1 9 8m1 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5" />
            <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8.96q.04-.245.04-.5C9 10.567 7.21 9 5 9c-2.086 0-3.8 1.398-3.984 3.181A1 1 0 0 1 1 12z" />
          </svg>
          <span className={collapsed ? "hidden" : ""}>Admin</span>
          <div class="admin-arrow">
            {adminCollapsed ? <BsChevronDown /> : <BsChevronRight />}
          </div>
        </div>
        <div className={`collapse ${adminCollapsed ? "show" : "hide"}`}>
            {screenType.includes("Company") && (
          <div className="submenu-container ms-3">
              <Link to="/Company" className="nav-link" title="Company">
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-buildings me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 1 .487.022M6 8.694 1 10.36V15h5zM7 15h2v-1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V15h2V1.309l-7 3.5z" />
                    <path d="M2 11h1v1H2zm2 0h1v1H4zm-2 2h1v1H2zm2 0h1v1H4zm4-4h1v1H8zm2 0h1v1h-1zm-2 2h1v1H8zm2 0h1v1h-1zm2-2h1v1h-1zm0 2h1v1h-1zM8 7h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zM8 5h1v1H8zm2 0h1v1h-1zm2 0h1v1h-1zm0-2h1v1h-1z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="">
                    Company
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("CompanyMapping") && (
          <div className="submenu-container ms-3">
              <Link
                to="/CompanyMapping"
                className="nav-link"
                title="Company Mapping"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-clipboard-pulse me-3"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-5 0A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5v1A1.5 1.5 0 0 1 9.5 4h-3A1.5 1.5 0 0 1 5 2.5zm-2 0h1v1H3a1 1 0 0 0-1 1V14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3.5a1 1 0 0 0-1-1h-1v-1h1a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3.5a2 2 0 0 1 2-2m6.979 3.856a.5.5 0 0 0-.968.04L7.92 10.49l-.94-3.135a.5.5 0 0 0-.895-.133L4.232 10H3.5a.5.5 0 0 0 0 1h1a.5.5 0 0 0 .416-.223l1.41-2.115 1.195 3.982a.5.5 0 0 0 .968-.04L9.58 7.51l.94 3.135A.5.5 0 0 0 11 11h1.5a.5.5 0 0 0 0-1h-1.128z"
                    />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="">
                    Company Mapping
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("Location") && (
          <div className="submenu-container ms-3">
              <Link to="/Location" className="nav-link" title="Location">
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-geo-alt me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10" />
                    <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="ms-1">
                    Location
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("Role") && (
          <div className="submenu-container ms-3">
              <Link
                to="/Role"
                className={`nav-link submenu-link ${location.pathname === "/Role" ? "active" : ""
                  }`}
                title="Role"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-person-circle me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                    <path
                      fill-rule="evenodd"
                      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
                    />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="">
                    Role
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("UserRoleMapping") && (
          <div className="submenu-container ms-3">
              <Link
                to="/UserRoleMapping"
                className="nav-link"
                title="Role Mapping"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-person-fill-check me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                    <path d="M2 13c0 1 1 1 1 1h5.256A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1 1.544-3.393Q8.844 9.002 8 9c-5 0-6 3-6 4" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""}>
                    Role Mapping
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("RoleRights") && (
          <div className="submenu-container ms-3">
              <Link
                to="/RoleRights"
                className={`nav-link submenu-link ${location.pathname === "/RoleRights" ? "active" : ""
                  }`}
                title="Role Rights"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-person-fill-gear me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-9 8c0 1 1 1 1 1h5.256A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1 1.544-3.393Q8.844 9.002 8 9c-5 0-6 3-6 4m9.886-3.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382zM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""}>Role Rights</span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("User") && (
          <div className="submenu-container ms-3">
              <Link
                to="/User"
                className={`nav-link submenu-link ${location.pathname === "/User" ? "active" : ""
                  }`}
                title="User"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="bi bi-people-fill me-3"
                    viewBox="0 0 16 16"
                  >
                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="">
                    User
                  </span>
                </div>
              </Link>
          </div>
            )}
        </div>
        <div
          className="menu-item"
          onClick={toggleMastersCollapse}
          title="Masters"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            class="bi bi-lightning-fill me-2 masters-font"
            viewBox="0 0 16 16"
          >
            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641z" />
          </svg>
          <span className={collapsed ? "hidden" : ""}>Masters</span>
          <div class="master-arrow">
            {mastersCollapsed ? <BsChevronDown /> : <BsChevronRight />}
          </div>
        </div>
        <div className={`collapse ${mastersCollapsed ? "show" : ""}`}>
            {screenType.includes("Attribute") && (
          <div className="submenu-container ms-3">
              <Link
                to="/Attribute"
                className={`nav-link submenu-link ${location.pathname === "/Attribute" ? "active" : ""
                  }`}
                title="Attribute"
              >
                <div class="menu-item">
                  <CardText size={18} className="me-3" />
                  <span className={collapsed ? "hidden" : ""} class="">
                    Attribute
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("LeaveMasterGrid") && (
          <div className="submenu-container ms-3">
              <Link
                to="/LeaveMasterGrid"
                className={`nav-link submenu-link ${location.pathname === "/LeaveMasterGrid" ? "active" : ""
                  }`}
                title="Holiday Master"
              >
                <div className="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className="me-3"
                    viewBox="0 0 24 24"
                  >
                    <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 18H5V9h14v11zm-8-4 2 2 4-4-1.4-1.4-2.6 2.6-0.6-0.6L11 16z" />
                  </svg>

                  <span className={collapsed ? "hidden" : ""}>
                    Holiday Master
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("EmployeeInfo") && (
          <div className="submenu-container ms-3">
              <Link
                to="/EmployeeInfo"
                className={`nav-link submenu-link ${location.pathname === "/EmployeeInfo" ? "active" : ""
                  }`}
                title="Employee Master"
              >
                <div className="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className="me-3"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zM12 14c3.87 0 7 1.28 7 3v1H5v-1c0-1.72 3.13-3 7-3z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""}>
                    Employee Master
                  </span>
                </div>
              </Link>
          </div>
            )}
        </div>
        <div
          className="menu-item"
          onClick={toggleReportCollapse}
          title="Report"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            class="bi bi-clipboard-data me-2 Report-font"
            viewBox="0 0 16 16"
          >
            <path d="M4 11a1 1 0 1 1 2 0v1a1 1 0 1 1-2 0zm6-4a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0zM7 9a1 1 0 0 1 2 0v3a1 1 0 1 1-2 0z" />
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z" />
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z" />
          </svg>
          <span className={collapsed ? "hidden" : ""}>Report</span>
          <div class="report-arrow">
            {reportCollapsed ? <BsChevronDown /> : <BsChevronRight />}
          </div>
        </div>
        <div className={`collapse ${reportCollapsed ? "show" : ""}`}>
            {screenType.includes("AttenReport") && (
          <div className="submenu-container ms-3">
              <Link
                to="/AttenReport"
                className={`nav-link submenu-link ${location.pathname === "/AttenReport" ? "active" : ""
                  }`}
                title="Attendance Summary Report"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor "
                    className="me-3"
                    viewBox="0 0 640 512"
                  >
                    <path d="M624 368h-16V243.2c0-12.7-7.5-24.2-19-29.2L488 150.3V96c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h16c0 35.3 28.7 64 64 64s64-28.7 64-64h192c0 35.3 28.7 64 64 64s64-28.7 64-64h16c35.3 0 64-28.7 64-64v-32c0-8.8-7.2-16-16-16zM512 304h-64v-64h51.2L512 274.2V304zM128 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zM416 96h48v64h-48V96zM64 192V96h288v96H64z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="ms-2">
                    Attendance Summary Report
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("AttenContracts") && (
          <div className="submenu-container ms-3">
              <Link
                to="/AttenContracts"
                className={`nav-link submenu-link ${location.pathname === "/AttenContracts" ? "active" : ""
                  }`}
                title="Attendance Summary for Contracts"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="me-3"
                  >
                    <path d="M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64L0 400c0 44.2 35.8 80 80 80l400 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 416c-8.8 0-16-7.2-16-16L64 64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="ms-2">
                    Attendance Summary for Contracts
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("DailyAttendance") && (
          <div className="submenu-container ms-3">
              <Link
                to="/DailyAttendance"
                className={`nav-link submenu-link ${location.pathname === "/DailyAttendance" ? "active" : ""
                  }`}
                title="Daily Attendance Report"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="me-3"
                    viewBox="0 0 576 512"
                  >
                    <path d="M64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L64 64zM272 192l224 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zM256 304c0-8.8 7.2-16 16-16l224 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16zM164 152l0 13.9c7.5 1.2 14.6 2.9 21.1 4.7c10.7 2.8 17 13.8 14.2 24.5s-13.8 17-24.5 14.2c-11-2.9-21.6-5-31.2-5.2c-7.9-.1-16 1.8-21.5 5c-4.8 2.8-6.2 5.6-6.2 9.3c0 1.8 .1 3.5 5.3 6.7c6.3 3.8 15.5 6.7 28.3 10.5l.7 .2c11.2 3.4 25.6 7.7 37.1 15c12.9 8.1 24.3 21.3 24.6 41.6c.3 20.9-10.5 36.1-24.8 45c-7.2 4.5-15.2 7.3-23.2 9l0 13.8c0 11-9 20-20 20s-20-9-20-20l0-14.6c-10.3-2.2-20-5.5-28.2-8.4c0 0 0 0 0 0s0 0 0 0c-2.1-.7-4.1-1.4-6.1-2.1c-10.5-3.5-16.1-14.8-12.6-25.3s14.8-16.1 25.3-12.6c2.5 .8 4.9 1.7 7.2 2.4c13.6 4.6 24 8.1 35.1 8.5c8.6 .3 16.5-1.6 21.4-4.7c4.1-2.5 6-5.5 5.9-10.5c0-2.9-.8-5-5.9-8.2c-6.3-4-15.4-6.9-28-10.7l-1.7-.5c-10.9-3.3-24.6-7.4-35.6-14c-12.7-7.7-24.6-20.5-24.7-40.7c-.1-21.1 11.8-35.7 25.8-43.9c6.9-4.1 14.5-6.8 22.2-8.5l0-14c0-11 9-20 20-20s20 9 20 20z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="ms-2">
                    Daily Attendance Report
                  </span>
                </div>
              </Link>
          </div>
            )}
            {screenType.includes("AttenMachine") && (
          <div className="submenu-container ms-3">
              <Link
                to="/AttenMachine"
                className={`nav-link submenu-link ${location.pathname === "/AttenMachine" ? "active" : ""
                  }`}
                title="Attendance Machine Log"
              >
                <div class="menu-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="18"
                    height="18"
                    fill="currentColor"
                    class="me-3"
                  >
                    <path d="M24 32c13.3 0 24 10.7 24 24l0 352c0 13.3 10.7 24 24 24l416 0c13.3 0 24 10.7 24 24s-10.7 24-24 24L72 480c-39.8 0-72-32.2-72-72L0 56C0 42.7 10.7 32 24 32zM128 136c0-13.3 10.7-24 24-24l208 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-208 0c-13.3 0-24-10.7-24-24zm24 72l144 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-144 0c-13.3 0-24-10.7-24-24s10.7-24 24-24zm0 96l272 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-272 0c-13.3 0-24-10.7-24-24s10.7-24 24-24z" />
                  </svg>
                  <span className={collapsed ? "hidden" : ""} class="ms-2">
                    Attendance Machine Log
                  </span>
                </div>
              </Link>
          </div>
            )}
        </div>
      </div>
      <div
        className="sidebar-footer position-fixed text-center bg-dark pt-2 fw-bold pb-1"
        style={{ paddingRight: "85px", paddingLeft: "70px" }}
      >
        <h3 className="">YJK Technologies</h3>
        <h3 className="">Version 1.0.0</h3>
      </div>
    </div>
  );
};

export default Sidebar;