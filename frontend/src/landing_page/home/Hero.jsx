// src/landing_page/Hero.jsx
import React from "react";

const Hero = () => {
  return (
    <section className="bg-light py-5">
      <div className="container">
        <div className="row align-items-center">
          {/* Left side - text */}
          <div className="col-md-6">
            <h1 className="display-4 fw-bold text-primary">
              Simplify Your Timetable Generation
            </h1>
            <p className="lead text-secondary mt-3 mb-4">
              Create error-free, optimized timetables for your classes in just a
              few clicks. Save time and focus on what matters most — teaching.
            </p>
            <div>
              <a href="/signup" className="btn btn-primary btn-lg me-3">
                Signup Now
              </a>
              <a href="#learn" className="btn btn-outline-primary btn-lg">
                Learn More
              </a>
            </div>
          </div>

          {/* Right side - image */}
          <div className="col-md-6 text-center mt-4 mt-md-0">
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
