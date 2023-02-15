import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import os from "os";
const tmpDir = os.tmpdir();
import generateFileName from "./helpers/generateName.mjs";
import util from "util";
const execAsync = util.promisify(exec);

export const handler = async (event) => {
  // TODO implement
  // const whatis = typeof event;
  // const response = {
  //     statusCode: 200,
  //     code: JSON.stringify(event),
  // }

  // return response;

  try {
    const fileName = await generateFileName();
    const { code, input = "" } = JSON.parse(event["body"]);

    const codePath = path.join(tmpDir, fileName + ".py");
    const inputPath = path.join(tmpDir, fileName + ".txt");

    await fs.writeFile(codePath, code, function (err) {
      if (err) throw err;
    });
    await fs.writeFile(inputPath, input, function (err) {
      if (err) throw err;
    });
    const startTime = new Date().getTime();
    const { error, stdout, stderr } = await execAsync(
      `python3 ${codePath} < ${inputPath}`,
      { timeout: 4000 }
    ).catch((error) => {
      if (error.killed && error.signal === "SIGTERM"){
        throw new Error("Time Limit Exceeded");
      }
      throw error;
    });
    const endTime = new Date().getTime();
    const executionTime = endTime - startTime;

    const output = error || stderr || stdout;
    await fs.unlink(codePath);
    await fs.unlink(inputPath);
    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      isBase64Encoded: false,
      body: JSON.stringify({ data: output, status: true, executionTime:executionTime }),
    };

    return response;
  } catch (err) {
    const response = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      isBase64Encoded: false,
      body: JSON.stringify({ data: `${err.message}`, status: false }),
    };

    return response;
  }
};
