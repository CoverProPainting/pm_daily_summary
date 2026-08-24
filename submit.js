const nodemailer = require('nodemailer');

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function yn(val) {
  if (val === 'yes') return 'Yes';
  if (val === 'no') return 'No';
  return esc(val) || '—';
}

function buildJobHtml(job, index) {
  const rows = [];
  rows.push(`<h3 style="margin:18px 0 6px;color:#1a1a1a;">Job ${index + 1}: ${esc(job.jobName) || '(no name entered)'}</h3>`);
  rows.push(`<table style="width:100%;border-collapse:collapse;font-size:14px;">`);

  const row = (label, value) => `<tr><td style="padding:4px 8px 4px 0;color:#555;width:220px;vertical-align:top;">${label}</td><td style="padding:4px 0;">${value}</td></tr>`;

  rows.push(row('Customer onsite today?', yn(job.onsite)));
  rows.push(row('Customer contact (who/how/when)', esc(job.contact) || '—'));
  rows.push(row('Status', esc(job.status) || '—'));
  rows.push(row('Punch list confirmed?', yn(job.punchList)));
  if (job.status === 'Completed today' || job.status === 'Completing tomorrow') {
    rows.push(row('Walkthrough scheduled?', yn(job.walkthrough) + (job.walkthroughDate ? ` (${esc(job.walkthroughDate)})` : '')));
  }
  rows.push(row('Carpentry/pricing needed?', yn(job.carpentry)));
  if (job.carpentry === 'yes') {
    rows.push(row('&nbsp;&nbsp;What\'s needed', esc(job.carpentryDetail) || '—'));
    rows.push(row('&nbsp;&nbsp;Photos in CompanyCam?', job.companyCamPhotos ? 'Yes' : 'No'));
    rows.push(row('&nbsp;&nbsp;Change order', esc(job.changeOrder) || '—'));
  }
  rows.push(row('Customer concern?', yn(job.concern)));
  if (job.concern === 'yes') {
    rows.push(row('&nbsp;&nbsp;What concern', esc(job.concernDetail) || '—'));
  }
  rows.push(row('Job site issue?', yn(job.issue)));
  if (job.issue === 'yes') {
    rows.push(row('&nbsp;&nbsp;What issue', esc(job.issueDetail) || '—'));
  }
  rows.push('</table>');
  return rows.join('\n');
}

function buildActionItems(jobs) {
  const items = [];
  jobs.forEach((job) => {
    const name = job.jobName || '(unnamed job)';
    if (job.carpentry === 'yes') {
      items.push(`${name} — carpentry/pricing needed${job.changeOrder === 'Still needed' ? ', change order still needed' : ''}`);
    }
    if (job.concern === 'yes') {
      items.push(`${name} — customer concern flagged`);
    }
    if (job.issue === 'yes') {
      items.push(`${name} — job site issue flagged`);
    }
  });
  return items;
}

function buildEmailHtml(data) {
  const jobs = data.jobs || [];
  const actionItems = buildActionItems(jobs);

  let html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:680px;">
    <h2 style="margin-bottom:0;">PM Daily Summary</h2>
    <p style="color:#555;margin-top:4px;">${esc(data.pmName)} — ${esc(data.date)}</p>
    <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
    ${jobs.map((job, i) => buildJobHtml(job, i)).join('\n')}
    <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
    <h3 style="margin:0 0 6px;">Admin Block</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 8px 4px 0;color:#555;width:220px;">Time clocked as admin</td><td style="padding:4px 0;">${esc(data.adminTime) || '—'}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#555;vertical-align:top;">What he was doing</td><td style="padding:4px 0;">${(data.adminActivities || []).map(esc).join(', ') || '—'}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#555;">Customers spoken with</td><td style="padding:4px 0;">${esc(data.adminCustomers) || '—'}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;color:#555;vertical-align:top;">Brief summary</td><td style="padding:4px 0;white-space:pre-wrap;">${esc(data.adminSummary) || '—'}</td></tr>
    </table>
    <h3 style="margin:20px 0 6px;">Anything Else for Alex or Nina</h3>
    <p style="white-space:pre-wrap;">${esc(data.otherNotes) || '—'}</p>
    <h3 style="margin:20px 0 6px;">Tomorrow's Plan</h3>
    <p style="white-space:pre-wrap;">${esc(data.tomorrowPlan) || '—'}</p>
    <h3 style="margin:20px 0 6px;background:#fff8e1;padding:8px;border-left:4px solid #f5a623;">Action Items</h3>
    ${actionItems.length ? `<ul>${actionItems.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p style="color:#555;">None auto-flagged from job cards.</p>'}
    <p style="white-space:pre-wrap;"><strong>Additional notes:</strong> ${esc(data.actionNotes) || '—'}</p>
    <h3 style="margin:20px 0 6px;">Recap sent to Justin (Black Pearl)</h3>
    <p style="white-space:pre-wrap;">${esc(data.justinRecap) || '—'}</p>
  </div>`;
  return html;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  try {
    const data = req.body || {};

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const recipients = (process.env.EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipients,
      subject: `PM Daily Summary — ${data.pmName || 'PM'} — ${data.date || ''}`,
      html: buildEmailHtml(data),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
