"use strict";

require("dotenv").config();
const app = require("./api/index");
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});
