// src/landing_page/Footer.jsx
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-primary text-white mt-5">
      <div className="container py-4">
        <div className="row">
          {/* Brand / About */}
          <div className="col-md-4 mb-3">
            <h5 className="fw-bold">Timetable Generator</h5>
            <p className="small">
              A smart solution to create error-free, optimized timetables for
              schools and colleges. Save time, stay organized, and focus on what
              matters most.
            </p>
          </div>

          <div className="col-md-4 mb-3"></div>

          {/* Contact / Socials */}
          <div className="col-md-4 mb-3">
            <h6 className="fw-bold">Connect With Us</h6>
            <p className="small mb-1">📧 support@timetablegen.com</p>
            <p className="small mb-3">📞 +91 XXXXXXXXXX</p>
            <div>
              <a
                href="#"
                className="text-white me-3 fs-5"
                aria-label="Facebook"
              >
                <i className="bi bi-facebook"></i>
              </a>
              <a
                href="#"
                className="text-white me-3 fs-5"
                aria-label="Twitter"
              >
                <i className="bi bi-twitter"></i>
              </a>
              <a href="#" className="text-white fs-5" aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center border-top border-light pt-3 mt-3">
          <p className="mb-0 small">
            &copy; {new Date().getFullYear()} Timetable Generator. All Rights
            Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
