module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const { password } = req.body || {};
  if (password && password === process.env.FORM_PASSWORD) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
};
