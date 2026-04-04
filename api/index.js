const { handleRequest } = require("../headless-frontend/server");

module.exports = async function vercelHandler(req, res) {
  await handleRequest(req, res);
};
