import React, { useState, useEffect, useRef } from "react";
import "./input.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useLocation } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import LoadingScreen from './LoadingScreen';
const config = require('./Apiconfig');

function Role_input({ }) {
  const [role_id, setRole_id] = useState("");
  const [role_name, setRole_name] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const roleid = useRef(null);
  const rolename = useRef(null);
  const Description = useRef(null);
  const [hasValueChanged, setHasValueChanged] = useState(false);
  const created_by = sessionStorage.getItem('selectedUserCode')
  const [isUpdated, setIsUpdated] = useState(false);
  const location = useLocation();
  const { mode, selectedRow } = location.state || {};
  const modified_by = sessionStorage.getItem("selectedUserCode");
  const [loading, setLoading] = useState(false);
  console.log(selectedRow);

  const clearInputFields = () => {
    setRole_id("");
    setRole_name("");
    setDescription("");
  };

  useEffect(() => {
    if (mode === "update" && selectedRow && !isUpdated) {
      setRole_id(selectedRow.role_id || "");
      setRole_name(selectedRow.role_name || "");
      setDescription(selectedRow.description || "");
    }
    else if (mode === "create") {
      clearInputFields();
    }
  }, [mode, selectedRow, isUpdated]);

  const handleInsert = async () => {
    if (!role_id || !role_name) {
      setError(" ");
      toast.warning("Error: Missing required fields");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/addRoleInfoData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_code: sessionStorage.getItem('selectedCompanyCode'),

          role_id,
          role_name,
          description,
          created_by: sessionStorage.getItem('selectedUserCode')
        }),
      });
      if (response.status === 200) {
        console.log("Data inserted successfully");
        setTimeout(() => {
          toast.success("Data inserted successfully!", {
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
      toast.error('Error inserting data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleNavigate = () => {
    navigate("/Role");
  };

  const handleKeyDown = async (e, nextFieldRef, value, hasValueChanged, setHasValueChanged) => {
    if (e.key === 'Enter') {
      if (hasValueChanged) {
        await handleKeyDownStatus(e);
        setHasValueChanged(false);
      }

      if (value) {
        nextFieldRef.current.focus();
      } else {
        e.preventDefault();
      }
    }
  };

  const handleKeyDownStatus = async (e) => {
    if (e.key === 'Enter' && hasValueChanged) {
      setHasValueChanged(false);
    }
  };

  const handleUpdate = async () => {
    if (!role_id || !role_name) {
      setError(" ");
      toast.warning("Error: Missing required fields");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/RoleUpdates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_code: sessionStorage.getItem('selectedCompanyCode'),
          role_id,
          role_name,
          description,
          created_by,
          modified_by,
        }),
      });
      if (response.status === 200) {
        setTimeout(() => {
          toast.success("Data updated successfully!", {
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
      toast.error('Error inserting data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="container-fluid Topnav-screen ">
      {loading && <LoadingScreen />}
      <ToastContainer position="top-right" className="toast-design" theme="colored" />
      <div className="shadow-lg  bg-body-tertiary rounded ">
        <div className=" mb-0 d-flex justify-content-between" >
          <h1 align="left" class="purbut">{mode === "update" ? 'Update Role' : 'Add Role'}  </h1>
          <h1 align="left" class="fs-4 mobileview">{mode === "update" ? 'Update Role' : 'Add Role'}  </h1>
          <button onClick={handleNavigate} className=" btn btn-danger shadow-none rounded-0 h-70 fs-5" required title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="pt-2 mb-4">
        <div className="shadow-lg p-0 mb-2 pb-4 pe-4 ps-5 bg-body-tertiary rounded">
          <div class="row me-3">
            <div className="col-md-3 mt-3 col-12 form-group mb-2">
              <div class="exp-form-floating">
                <div class="d-flex justify-content-start">
                  <div>
                    <label for="rid" className={`exp-form-labels ${error && !role_id ? 'text-danger' : ''}`}>Role ID<span className="text-danger">*</span></label>
                  </div>
                </div>
                <input
                  id="rid"
                  class="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required title="please enter the role ID"
                  value={role_id}
                  onChange={(e) => setRole_id(e.target.value)}
                  maxLength={18}
                  ref={roleid}
                  readOnly={mode === "update"}
                  onKeyDown={(e) => handleKeyDown(e, rolename, roleid)}
                />
              </div>
            </div>
            <div className="col-md-3 mt-3 form-group">
              <div class="exp-form-floating">
                <div class="d-flex justify-content-start">
                  <div>
                    <label for="rid" className={`exp-form-labels ${error && !role_name ? 'text-danger' : ''}`}> Role Name<span className="text-danger">*</span></label>
                  </div>
                </div>
                <input
                  id="rname"
                  class="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required title="please enter the role name"
                  value={role_name}
                  onChange={(e) => setRole_name(e.target.value)}
                  maxLength={50}
                  ref={rolename}
                  onKeyDown={(e) => handleKeyDown(e, Description, rolename)}
                />
              </div>
            </div>
            <div className="col-md-3 mt-3 form-group">
              <div class="exp-form-floating">
                <div class="d-flex justify-content-start">
                  <div>
                    <label for="rid" class="exp-form-labels">Description</label>
                  </div>
                </div>
                <input
                  id="desc"
                  class="exp-input-field form-control"
                  type="text"
                  placeholder=""
                  required title="please enter the description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={255}
                  ref={Description}
                  onKeyDown={(e) => handleKeyDown(e, Description)}
                />
              </div>
            </div>
            <div className="col-md-3 mt-3 form-group  mb-2">
              {mode === "create" ? (
                <div class="exp-form-floating">
                  <div class="d-flex justify-content-start">
                    <div>
                      <label for="state" class="exp-form-labels">
                        Created By
                      </label>
                    </div>
                  </div>
                  <input
                    id="emailid"
                    class="exp-input-field form-control"
                    type="text"
                    placeholder=""
                    required
                    title="Please enter the email ID"
                    value={created_by}
                  />
                </div>
              ) : (
                <div class="exp-form-floating">
                  <div class="d-flex justify-content-start">
                    <div>
                      <label for="state" class="exp-form-labels">
                        Modified By
                      </label>
                    </div>
                  </div>
                  <input
                    id="emailid"
                    class="exp-input-field form-control"
                    type="text"
                    placeholder=""
                    required
                    title="Please enter the email ID"
                    value={modified_by}
                  />
                </div>
              )}
            </div>
            <div className="col-12 d-flex justify-content-end align-items-center">
              {mode === "create" ? (
                <button onClick={handleInsert} className="mt-4" title="Save">
                  <i class="fa-solid fa-floppy-disk"></i>
                </button>
              ) : (
                <button onClick={handleUpdate} className="mt-4" title="Update">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Role_input;