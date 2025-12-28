import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
	{ to: '/events', label: 'Events', icon: 'bi-calendar-event' },
	{ to: '/my-events', label: 'My Events', icon: 'bi-calendar-check' },
	{ to: '/bookmarks', label: 'Bookmarks', icon: 'bi-bookmark' },
	{ to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
	{ to: '/profile', label: 'Profile', icon: 'bi-person' },
];

const Navbar = ({ onSignOut }) => {
	const location = useLocation();
	return (
		<nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm rounded mb-3 px-3" style={{borderRadius:'1.2rem',marginTop:'1.2rem'}}>
			<div className="container-fluid">
				<Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/events" style={{fontSize:'1.35rem',color:'#3b5bfd'}}>
					<i className="bi bi-clock-history"></i> Clockdin
				</Link>
				<div className="collapse navbar-collapse">
					<ul className="navbar-nav me-auto mb-2 mb-lg-0">
						{navLinks.map(link => (
							<li className="nav-item" key={link.to}>
								<Link className={`nav-link d-flex align-items-center gap-1 ${location.pathname === link.to ? 'active fw-bold text-primary' : ''}`} to={link.to} style={{fontSize:'1.08rem'}}>
									<i className={`bi ${link.icon}`}></i> {link.label}
								</Link>
							</li>
						))}
					</ul>
					<button className="btn btn-outline-danger ms-2 px-3 py-1 d-flex align-items-center gap-2" style={{borderRadius:'1.2rem',fontWeight:600}} onClick={onSignOut}>
						<i className="bi bi-box-arrow-right"></i> Sign Out
					</button>
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
