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
    .catch(_ => false)
    .then(({ stdout }) =>
      fs
        .access(stdout.trim(), fs.constants.X_OK)
        .then(_ => true)
        .catch(_ => false)
    );
};

const chooseAsset = assets => {
  const asset = assets.find(_ => _.name.includes(platformFiles[platform]));

  if (!asset) {
    throw new Error(`Couldn't find any asset for platform '${platform}'`);
  }

  return asset;
};

const downloadAsset = asset => {
  const distFolder = path.resolve(__dirname, `dist`);
  const untarFolder = path.join(distFolder, asset.name.replace(".tar.gz", ""));
  const tarDest = path.join(distFolder, `download.tar.gz`);

  // These throw when they fail
  spawnSync("mkdir", { args: ["-p", "--", distFolder] });
  spawnSync("wget", {
    args: ["-O", tarDest, "--", asset.browser_download_url],
  });
  spawnSync("tar", {
    cwd: distFolder, // Run in the distFolder so it outputs to the right place
    args: ["xzf", tarDest],
  });
  spawnSync("mv", {
    args: [
      "-f",
      "--",
      path.join(untarFolder, "fd"),
      path.join(distFolder, "fd"),
    ],
  });
  spawnSync("rm", { args: ["-rf", "--", untarFolder, tarDest] });
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
  const req = request(
    {
      hostname: "api.github.com",
      path: "/repos/sharkdp/fd/releases/latest",
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
      },
    },
    res => {
      let data = "";

      res.on("data", _ => (data += _));
      res.on("end", _ => {
        let { assets } = JSON.parse(data);
        const asset = chooseAsset(assets);
        downloadAsset(asset);
      });
    }
  );
  req.on("error", console.log);
  req.end();
}

checkRequirements().then(main);
