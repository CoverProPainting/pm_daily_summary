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

  const row = (label, value) => `<tr><td style="padding:4px 8px 4px 0;color:#555;width:240px;vertical-align:top;">${label}</td><td style="padding:4px 0;">${value}</td></tr>`;

  rows.push(row('Customer onsite today?', yn(job.onsite)));
  rows.push(row('Site visit?', yn(job.siteVisit) + (job.siteVisit === 'yes' && job.siteVisitTime ? ` (${esc(job.siteVisitTime)})` : '')));
  rows.push(row('Second crew contact?', yn(job.secondCrewContact) + (job.secondCrewContact === 'yes' && job.secondCrewContactWho ? ` — ${esc(job.secondCrewContactWho)}` : '')));
  rows.push(row('Customer update given today?', yn(job.custUpdate)));
  if (job.custUpdate === 'yes') {
    rows.push(row('&nbsp;&nbsp;Method', esc(job.custUpdateMethod) || '—'));
    rows.push(row('&nbsp;&nbsp;What was covered', esc(job.custUpdateDetail) || '—'));
  }
  rows.push(row('Carpentry or Change Order Needed?', yn(job.carpentry)));
  if (job.carpentry === 'yes') {
    rows.push(row('&nbsp;&nbsp;What\'s needed', esc(job.carpentryDetail) || '—'));
    rows.push(row('&nbsp;&nbsp;Confirmed all needed pics in CompanyCam?', job.companyCamPhotos ? 'Yes' : 'No'));
    rows.push(row('&nbsp;&nbsp;Change order', esc(job.changeOrder) || '—'));
  }
  rows.push(row('Status', esc(job.status) || '—'));
  if (job.status === 'Job Delayed') {
    rows.push(row('&nbsp;&nbsp;Why delayed', esc(job.delayedNote) || '—'));
  }
  if (job.status === 'Completed') {
    rows.push(row('&nbsp;&nbsp;Payment collected?', yn(job.paymentCollected)));
    if (job.paymentCollected === 'no') {
      rows.push(row('&nbsp;&nbsp;&nbsp;&nbsp;Why not', esc(job.paymentReason) || '—'));
      rows.push(row('&nbsp;&nbsp;&nbsp;&nbsp;Note', esc(job.paymentNote) || '—'));
    }
  }
  rows.push(row('Walkthrough scheduled?', yn(job.walkthrough) + (job.walkthroughDate ? ` (${esc(job.walkthroughDate)})` : '')));
  rows.push(row('Punch list confirmed?', yn(job.punchList)));
  rows.push(row('Scope concerns or questions?', yn(job.concern)));
  if (job.concern === 'yes') {
    rows.push(row('&nbsp;&nbsp;What concern', esc(job.concernDetail) || '—'));
  }
  rows.push(row('Jobsite/crew/material issues or concerns?', yn(job.issue)));
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
      items.push(`${name} — carpentry/change order needed${job.changeOrder === 'Still needed' ? ', change order still needed' : ''}`);
    }
    if (job.status === 'Job Delayed') {
      items.push(`${name} — job delayed`);
    }
    if (job.status === 'Completed' && job.paymentCollected === 'no') {
      items.push(`${name} — payment not yet collected (${job.paymentReason || 'no reason given'})`);
    }
    if (job.concern === 'yes') {
      items.push(`${name} — scope concern or question flagged`);
    }
    if (job.issue === 'yes') {
      items.push(`${name} — jobsite/crew/material issue flagged`);
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

    // Separate, recap-only email to Justin — only sent if a recap was actually entered,
    // and only contains the recap, never the rest of the form.
    if (data.justinRecap && data.justinRecap.trim() && process.env.JUSTIN_EMAIL) {
      const justinHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:600px;">
          <h2 style="margin-bottom:4px;">Black Pearl Recap — ${esc(data.date)}</h2>
          <p style="white-space:pre-wrap;">${esc(data.justinRecap)}</p>
        </div>`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.JUSTIN_EMAIL,
        subject: `Black Pearl Recap — ${data.date || ''}`,
        html: justinHtml,
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
