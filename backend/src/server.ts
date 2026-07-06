import { app } from "./app.js";
import { settings } from "./config.js";

app.listen(settings.port, () => {
  console.log(`Application Pipeline API listening on port ${settings.port}`);
});
