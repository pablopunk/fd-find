const { request } = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const util = require("util");
const { exec, spawnSync } = require("child_process");
const exec_promise = util.promisify(exec);

const platform = os.platform();

const platformFiles = {
  linux: "x86_64-unknown-linux-gnu",
  darwin: "apple-darwin",
};

if (!platformFiles.hasOwnProperty(platform)) {
  throw new Error(`platform '${platform}' is not yet supported by this script`);
}

const commandExists = async cmd => {
  return await exec_promise(`command -v '${cmd}'`)
    .then(({ stdout }) =>
      fs
        .access(stdout.trim(), fs.constants.X_OK)
        .then(_ => true)
        .catch(_ => false)
    )
    .catch(_ => false);
};

const chooseAsset = assets => {
  const asset = assets.find(_ => _.name.includes(platformFiles[platform]));

  if (!asset) {
    throw new Error(`Couldn't find any asset for platform '${platform}'`);
  }

  return asset;
};

function runCommand(cmd, args, options) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...(options || {}) });
  if (res.status !== 0)
    throw new Error(`${cmd} failed with exit code ${res.status}`);
  return res;
}

const downloadAsset = asset => {
  const distFolder = path.resolve(__dirname, `dist`);
  const untarFolder = path.join(distFolder, asset.name.replace(".tar.gz", ""));
  const tarDest = path.join(distFolder, `download.tar.gz`);

  // These throw when they fail
  runCommand("mkdir", ["-p", "--", distFolder]);
  runCommand("wget", ["-qO", tarDest, "--", asset.browser_download_url]);
  runCommand("tar", ["xzf", tarDest], {
    cwd: distFolder, // Run in the distFolder so it outputs to the right place
  });
  runCommand("mv", [
    "-f",
    "--",
    path.join(untarFolder, "fd"),
    path.join(distFolder, "fd"),
  ]);
  spawnSync("rm", ["-rf", "--", untarFolder, tarDest]);
};

async function checkRequirements() {
  const requiredCommands = ["wget", "tar"];
  const missingCommands = [];

  const existsArr = await Promise.all(
    requiredCommands.map(cmd => commandExists(cmd))
  );
  existsArr.forEach((exists, i) => {
    if (!exists) missingCommands.push(requiredCommands[i]);
  });

  if (missingCommands.length > 0) {
    throw new Error(
      `Missing required commands: ${missingCommands.join(", ")}.`
    );
  }
}

function main() {
  const requestOptions = {
    hostname: "api.github.com",
    path: "/repos/sharkdp/fd/releases/latest",
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    },
  };
  const req = request(requestOptions, res => {
    let data = "";

    res.on("data", _ => (data += _));
    res.on("end", _ => {
      if (res.statusCode !== 200) {
        throw new Error(`Request failed with status code ${res.statusCode}`);
      }
      const obj = JSON.parse(data);
      if (!obj || !Array.isArray(obj.assets)) {
        throw new Error("no assets found in response");
      }
      const asset = chooseAsset(obj.assets);
      downloadAsset(asset);
    });
  });
  req.on("error", e => {
    console.error(e);
    console.error(
      "Error while downloading asset list. Please check your internet connection."
    );
  });
  req.end();
}

(async function () {
  try {
    await checkRequirements();
    main();
  } catch (e) {
    process.exitCode = 1;
    if (e instanceof Error) console.error(e.message);
    else console.error(e);
  }
})();
