module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(307, "/downloads/Setup%20SentraCore%20XDR.cmd");
};
