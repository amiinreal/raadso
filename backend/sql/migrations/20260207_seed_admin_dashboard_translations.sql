-- Seed translation keys for the Admin Dashboard
INSERT INTO translation_keys (key, domain, page) VALUES
('admin.dashboard.title', 'admin', 'admin_dashboard'),
('admin.dashboard.totalTenants', 'admin', 'admin_dashboard'),
('admin.dashboard.pendingApprovals', 'admin', 'admin_dashboard'),
('admin.dashboard.totalUsers', 'admin', 'admin_dashboard'),
('admin.dashboard.recentActivity', 'admin', 'admin_dashboard'),
('admin.dashboard.tenants', 'admin', 'admin_dashboard'),
('admin.dashboard.users', 'admin', 'admin_dashboard'),
('admin.dashboard.settings', 'admin', 'admin_dashboard'),
('admin.dashboard.approve', 'admin', 'admin_dashboard'),
('admin.dashboard.reject', 'admin', 'admin_dashboard'),
('admin.dashboard.viewDetails', 'admin', 'admin_dashboard'),
('admin.dashboard.noPending', 'admin', 'admin_dashboard'),
('admin.dashboard.status', 'admin', 'admin_dashboard'),
('admin.dashboard.actions', 'admin', 'admin_dashboard'),
('admin.dashboard.date', 'admin', 'admin_dashboard'),
('admin.dashboard.user', 'admin', 'admin_dashboard'),
('admin.dashboard.action', 'admin', 'admin_dashboard'),
('admin.dashboard.details', 'admin', 'admin_dashboard'),
('admin.dashboard.aboutCompany', 'admin', 'admin_dashboard'),
('admin.dashboard.noDescription', 'admin', 'admin_dashboard'),
('admin.dashboard.rejectionReason', 'admin', 'admin_dashboard'),
('admin.dashboard.rejectApplication', 'admin', 'admin_dashboard'),
('admin.dashboard.approveApplication', 'admin', 'admin_dashboard'),
('admin.dashboard.noUsersFound', 'admin', 'admin_dashboard'),
('admin.dashboard.noEmployersFound', 'admin', 'admin_dashboard'),
('admin.dashboard.noCandidatesFound', 'admin', 'admin_dashboard'),
('admin.common.website', 'admin', 'admin_dashboard'),
('admin.common.linkedin', 'admin', 'admin_dashboard'),
('admin.common.added', 'admin', 'admin_dashboard'),
('admin.common.details', 'admin', 'admin_dashboard'),
('admin.common.email', 'admin', 'admin_dashboard'),
('admin.common.phone', 'admin', 'admin_dashboard'),
('admin.common.orgNumberShort', 'admin', 'admin_dashboard'),
('admin.common.size', 'admin', 'admin_dashboard'),
('admin.common.formed', 'admin', 'admin_dashboard'),
('admin.common.reject', 'admin', 'admin_dashboard'),
('admin.common.approve', 'admin', 'admin_dashboard'),
('admin.common.role', 'admin', 'admin_dashboard'),
('admin.common.profile', 'admin', 'admin_dashboard'),
('admin.common.joined', 'admin', 'admin_dashboard'),
('admin.common.contact', 'admin', 'admin_dashboard'),
('admin.common.jobs', 'admin', 'admin_dashboard'),
('admin.common.active', 'admin', 'admin_dashboard'),
('admin.common.total', 'admin', 'admin_dashboard'),
('admin.common.orgNumber', 'admin', 'admin_dashboard'),
('admin.common.noName', 'admin', 'admin_dashboard'),
('admin.common.candidate', 'admin', 'admin_dashboard')
ON CONFLICT (key) DO NOTHING;

-- Seed translations for Admin Dashboard (English)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'en', CASE key
    WHEN 'admin.dashboard.title' THEN 'Admin Dashboard'
    WHEN 'admin.dashboard.totalTenants' THEN 'Total Tenants'
    WHEN 'admin.dashboard.pendingApprovals' THEN 'Pending Approvals'
    WHEN 'admin.dashboard.totalUsers' THEN 'Total Users'
    WHEN 'admin.dashboard.recentActivity' THEN 'Recent Activity'
    WHEN 'admin.dashboard.tenants' THEN 'Tenants'
    WHEN 'admin.dashboard.users' THEN 'Users'
    WHEN 'admin.dashboard.settings' THEN 'Settings'
    WHEN 'admin.dashboard.approve' THEN 'Approve'
    WHEN 'admin.dashboard.reject' THEN 'Reject'
    WHEN 'admin.dashboard.viewDetails' THEN 'View Details'
    WHEN 'admin.dashboard.noPending' THEN 'No pending approvals'
    WHEN 'admin.dashboard.status' THEN 'Status'
    WHEN 'admin.dashboard.actions' THEN 'Actions'
    WHEN 'admin.dashboard.date' THEN 'Date'
    WHEN 'admin.dashboard.user' THEN 'User'
    WHEN 'admin.dashboard.action' THEN 'Action'
    WHEN 'admin.dashboard.details' THEN 'Details'
    WHEN 'admin.dashboard.aboutCompany' THEN 'About Company'
    WHEN 'admin.dashboard.noDescription' THEN 'No description provided'
    WHEN 'admin.dashboard.rejectionReason' THEN 'Reason for Rejection'
    WHEN 'admin.dashboard.rejectApplication' THEN 'Reject Application'
    WHEN 'admin.dashboard.approveApplication' THEN 'Approve Application'
    WHEN 'admin.dashboard.noUsersFound' THEN 'No users found matching your criteria'
    WHEN 'admin.dashboard.noEmployersFound' THEN 'No employers found'
    WHEN 'admin.dashboard.noCandidatesFound' THEN 'No candidates found'
    WHEN 'admin.common.website' THEN 'Website'
    WHEN 'admin.common.linkedin' THEN 'LinkedIn'
    WHEN 'admin.common.added' THEN 'Added'
    WHEN 'admin.common.details' THEN 'Company Details'
    WHEN 'admin.common.email' THEN 'Email'
    WHEN 'admin.common.phone' THEN 'Phone'
    WHEN 'admin.common.orgNumberShort' THEN 'Org. No.'
    WHEN 'admin.common.size' THEN 'Size'
    WHEN 'admin.common.formed' THEN 'Founded'
    WHEN 'admin.common.reject' THEN 'Reject'
    WHEN 'admin.common.approve' THEN 'Approve'
    WHEN 'admin.common.role' THEN 'Role'
    WHEN 'admin.common.profile' THEN 'Profile'
    WHEN 'admin.common.joined' THEN 'Joined'
    WHEN 'admin.common.contact' THEN 'Contact'
    WHEN 'admin.common.jobs' THEN 'Jobs'
    WHEN 'admin.common.active' THEN 'Active'
    WHEN 'admin.common.total' THEN 'Total'
    WHEN 'admin.common.orgNumber' THEN 'Organization Number'
    WHEN 'admin.common.noName' THEN 'No Name'
    WHEN 'admin.common.candidate' THEN 'Candidate'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'admin.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;

-- Seed translations for Admin Dashboard (Somali)
INSERT INTO translations (translation_key_id, language, value)
SELECT id, 'so', CASE key
    WHEN 'admin.dashboard.title' THEN 'Dashboard-ka Maamulka'
    WHEN 'admin.dashboard.totalTenants' THEN 'Wadarta Kiraystayaasha'
    WHEN 'admin.dashboard.pendingApprovals' THEN 'Codsiyada Sugaya'
    WHEN 'admin.dashboard.totalUsers' THEN 'Wadarta Isticmaalayaasha'
    WHEN 'admin.dashboard.recentActivity' THEN 'Dhaqdhaqaaqyadii Ugu Dambeeyay'
    WHEN 'admin.dashboard.tenants' THEN 'Kiraystayaasha'
    WHEN 'admin.dashboard.users' THEN 'Isticmaalayaasha'
    WHEN 'admin.dashboard.settings' THEN 'Dejinta'
    WHEN 'admin.dashboard.approve' THEN 'Aqbal'
    WHEN 'admin.dashboard.reject' THEN 'Diid'
    WHEN 'admin.dashboard.viewDetails' THEN 'Eeg Faahfaahinta'
    WHEN 'admin.dashboard.noPending' THEN 'Majiraan codsiyo sugaya'
    WHEN 'admin.dashboard.status' THEN 'Heerka'
    WHEN 'admin.dashboard.actions' THEN 'Ficilada'
    WHEN 'admin.dashboard.date' THEN 'Taariikh'
    WHEN 'admin.dashboard.user' THEN 'Isticmaale'
    WHEN 'admin.dashboard.action' THEN 'Ficil'
    WHEN 'admin.dashboard.details' THEN 'Faahfaahin'
    WHEN 'admin.dashboard.aboutCompany' THEN 'Ku Saabsan Shirkadda'
    WHEN 'admin.dashboard.noDescription' THEN 'Faahfaahin lagama bixin'
    WHEN 'admin.dashboard.rejectionReason' THEN 'Sababta Diidmada'
    WHEN 'admin.dashboard.rejectApplication' THEN 'Diid Codsiga'
    WHEN 'admin.dashboard.approveApplication' THEN 'Aqbal Codsiga'
    WHEN 'admin.dashboard.noUsersFound' THEN 'Lamana helin isticmaalayaal'
    WHEN 'admin.dashboard.noEmployersFound' THEN 'Lamana helin shaqo-bixiyeyaal'
    WHEN 'admin.dashboard.noCandidatesFound' THEN 'Lamana helin murashaxiin'
    WHEN 'admin.common.website' THEN 'Websaydh'
    WHEN 'admin.common.linkedin' THEN 'LinkedIn'
    WHEN 'admin.common.added' THEN 'Lagu daray'
    WHEN 'admin.common.details' THEN 'Faahfaahinta Shirkadda'
    WHEN 'admin.common.email' THEN 'Iimayl'
    WHEN 'admin.common.phone' THEN 'Telefoon'
    WHEN 'admin.common.orgNumberShort' THEN 'Lamberka Org.'
    WHEN 'admin.common.size' THEN 'Baaxadda'
    WHEN 'admin.common.formed' THEN 'La aas-aasay'
    WHEN 'admin.common.reject' THEN 'Diid'
    WHEN 'admin.common.approve' THEN 'Aqbal'
    WHEN 'admin.common.role' THEN 'Doorka'
    WHEN 'admin.common.profile' THEN 'Profayl'
    WHEN 'admin.common.joined' THEN 'Ku biiray'
    WHEN 'admin.common.contact' THEN 'Xiriir'
    WHEN 'admin.common.jobs' THEN 'Shaqooyinka'
    WHEN 'admin.common.active' THEN 'Firfircoon'
    WHEN 'admin.common.total' THEN 'Wadarta'
    WHEN 'admin.common.orgNumber' THEN 'Lambarka Ururka'
    WHEN 'admin.common.noName' THEN 'Magac La''aan'
    WHEN 'admin.common.candidate' THEN 'Murashax'
    ELSE key
END
FROM translation_keys
WHERE key LIKE 'admin.%'
ON CONFLICT (translation_key_id, language) DO UPDATE SET value = EXCLUDED.value;
