import React from 'react';

const EventModal = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center w-100">
              <div className="flex-grow-1">
                <h5 className="modal-title fw-bold" style={{color: '#3b5bfd'}}>{event.title}</h5>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="event-badge">{event.type}</span>
                  {event.difficulty && (
                    <span className={`difficulty-badge ${event.difficulty.toLowerCase()}`}>
                      {event.difficulty}
                    </span>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
          </div>
          
          <div className="modal-body">
            {/* Event Image */}
            {event.image && (
              <div className="text-center mb-4">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="img-fluid rounded"
                  style={{maxHeight: '200px', maxWidth: '300px'}}
                />
              </div>
            )}

            {/* Basic Information */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="info-card">
                  <h6 className="info-title">📅 Event Date</h6>
                  <p className="info-content">
                    {event.eventDate ? new Date(event.eventDate).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    }) : 'TBD'}
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-card">
                  <h6 className="info-title">⏰ Application Deadline</h6>
                  <p className="info-content">
                    {event.deadline ? new Date(event.deadline).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    }) : 'TBD'}
                  </p>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-6">
                <div className="info-card">
                  <h6 className="info-title">📍 Location</h6>
                  <p className="info-content">{event.location}</p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-card">
                  <h6 className="info-title">💻 Mode</h6>
                  <p className="info-content">{event.mode || 'TBD'}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h6 className="info-title">📝 Description</h6>
              <p className="info-content">{event.detailedDescription || event.description}</p>
            </div>

            {/* Detailed Information Grid */}
            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">📋 Eligibility</h6>
                  <p className="info-content">{event.eligibility || 'Check official website for details'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">👥 Team/Individual</h6>
                  <p className="info-content">{event.teamOrIndividual || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">⏱️ Duration</h6>
                  <p className="info-content">{event.duration || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">💼 Workload</h6>
                  <p className="info-content">{event.workload || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">🎁 Stipend & Perks</h6>
                  <p className="info-content">{event.stipendPerks || 'Check official website for details'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">🏢 Organizer</h6>
                  <p className="info-content">{event.organizerReputation || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">📚 Learning Opportunities</h6>
                  <p className="info-content">{event.learningOpportunities || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">🎯 Future Scope</h6>
                  <p className="info-content">{event.futureScope || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">👥 Networking</h6>
                  <p className="info-content">{event.networking || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">📊 Expected Applicants</h6>
                  <p className="info-content">{event.applicants || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">👨‍🏫 Mentorship</h6>
                  <p className="info-content">{event.mentorship || 'TBD'}</p>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <div className="info-card">
                  <h6 className="info-title">💬 Past Reviews</h6>
                  <p className="info-content review-text">{event.pastReviews || 'No reviews available yet'}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-4">
                <h6 className="info-title">🏷️ Tags</h6>
                <div className="d-flex flex-wrap gap-2">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="event-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Close
            </button>
            <a
              href={event.applyLink || event.link || '#'}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apply Now <i className="bi bi-box-arrow-up-right ms-1"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
