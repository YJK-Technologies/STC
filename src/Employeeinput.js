import React, { useState, useEffect, useRef } from "react";
import "./input.css";
//import "./exp.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import Select from 'react-select'
import 'react-toastify/dist/ReactToastify.css';
import { useLocation } from "react-router-dom";
import CompanyPopup from './CompanyPopup';
import DepartmentPopup from './EmpDeptPopup';

function EmployeeInput({ }) {

  const [employeeId, setEmployeeId] = useState('');
  const [salutation, setSalutation] = useState('');
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [designation, setDesignation] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [open, setOpen] = React.useState(false);
  const [open1, setOpen1] = React.useState(false);

  const navigate = useNavigate();

  const location = useLocation();
  const { employeeData } = location.state || {};

  useEffect(() => {
    if (employeeData && employeeData.length > 0) {
      const data = employeeData[0];

      setEmployeeId(data.EmpCd || "");
      setFullName(data.EmpDs || "");
      setDepartment(data.DepartmentCd || "");
      setCompany(data.EmpCompany || "");
      setDesignation(data.EmpDesignation || "");
      setSection(data.EmpSection || "");
      setWorkLocation(data.EmpWorkLocation || "");
      setFirstName(data.FirstName || "");
      setLastName(data.LastName || "");
      setSalutation(data.Salutation || "");
      setJoinDate(data.EmpJoinDate?.split("T")[0] || "");
    }
  }, [employeeData]);

  const handleNavigate = () => {
    navigate("/EmployeeInfo");
  };

  const handleCompany = () => {
    setOpen(true);
  };

  const handleDepartment = () => {
    setOpen1(true);
  };

  const handleClose = () => {
    setOpen(false);
    setOpen1(false);
  };

  const handleCompanyData = async (data) => {
    if (data && data.length > 0) {
      console.log(data)
      const [{ CompId }] = data;
      setCompany(CompId);
    } else {
      console.error('Data is empty or undefined');
    }
  };

  const handleDepartmentData = async (data) => {
    if (data && data.length > 0) {
      console.log(data)
      const [{ DEPARTMENTCD }] = data;
      setDepartment(DEPARTMENTCD);
    } else {
      console.error('Data is empty or undefined');
    }
  };

  return (
    <div className="container-fluid Topnav-screen">
      <div>
        <div className="shadow-lg p-0 bg-body-tertiary rounded">
          <div className="mb-0 d-flex justify-content-between">
            <h1 className=""> Employee Details</h1>
            <button onClick={handleNavigate} className="btn btn-danger shadow-none rounded-0 h-70 fs-5" title="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div className="shadow-lg p-3 bg-body-tertiary rounded mt-2">
          <div className="row">
            <div className="col-md-6">
              <div className=" rounded p-3 bg-light">
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Employee I.D.</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Salutation</label>
                  <div className="col-sm-8">
                    <select className="form-select">
                      <option value="">-- Select --</option>
                      <option>Mr.</option>
                      <option>Ms.</option>
                      <option>Mrs.</option>
                    </select>
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Full Name</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={fullName}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">First Name</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={firstName}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Middle Name</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={middleName}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Last Name</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={lastName}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className=" rounded p-3 bg-light">
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Company</label>
                  <div className="col-sm-8 position-relative">
                    <input
                      type="text"
                      className="form-control pe-5"
                      value={company}
                      readOnly
                    />
                    <span
                      className="icon searchIcon position-absolute top-50 end-0 translate-middle-y me-4"
                      onClick={handleCompany}
                      style={{ cursor: "pointer" }}
                    >
                      <i className="fa fa-search"></i>
                    </span>
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Work Location</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={workLocation}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Department</label>
                  <div className="col-sm-8 position-relative">
                    <input
                      type="text"
                      className="form-control pe-5"
                      value={department}
                      readOnly
                    />
                    <span
                      className="icon searchIcon position-absolute top-50 end-0 translate-middle-y me-4"
                      onClick={handleDepartment}
                      style={{ cursor: "pointer" }}
                    >
                      <i className="fa fa-search"></i>
                    </span>
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Section</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={section}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Designation</label>
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      value={designation}
                      readOnly
                    />
                  </div>
                </div>
                <div className="row mb-3 align-items-center">
                  <label className="col-sm-4 col-form-label">Join Date</label>
                  <div className="col-sm-8">
                    <input
                      type="date"
                      className="form-control"
                      value={joinDate}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <CompanyPopup open={open} handleClose={handleClose} handleCompanyData={handleCompanyData} />
          <DepartmentPopup open={open1} handleClose={handleClose} handleDepartmentData={handleDepartmentData} />
        </div>
      </div>
    </div>
  );
}
export default EmployeeInput;