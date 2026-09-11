import fs from "fs";
import path from "path";
import unzipper from "unzipper";

const zipFilePath = path.join(process.cwd(), "public", "data.zip");
const outputDataDir = path.join(process.cwd(), "public", "data");
const jsonOutputPath = path.join(process.cwd(), "public", "observations.json");

async function processZipAndGenerateIndex() {
  console.log("1. Extracting data.zip into public/data/...");

  if (!fs.existsSync(outputDataDir)) {
    fs.mkdirSync(outputDataDir, { recursive: true });
  }

  if (fs.existsSync(zipFilePath)) {
    await fs
      .createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: outputDataDir }))
      .promise();
    console.log("Extraction complete!");
  } else {
    console.log("Reading existing files inside public/data/...");
  }

  console.log("2. Indexing matched .mp4 and .txt pairs...");

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
    return arrayOfFiles;
  }

  const allFiles = getAllFiles(outputDataDir);
  const fileMap = new Map<string, { mp4?: string; txt?: string }>();

  allFiles.forEach((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    if (ext === ".mp4" || ext === ".txt") {
      if (!fileMap.has(baseName)) {
        fileMap.set(baseName, {});
      }
      const record = fileMap.get(baseName)!;
      const relativePath = filePath
        .split(path.sep + "public" + path.sep)[1]
        .replace(/\\/g, "/");

      if (ext === ".mp4") record.mp4 = `/${relativePath}`;
      if (ext === ".txt") record.txt = filePath;
    }
  });

  const observations: any[] = [];
  let index = 1;

  fileMap.forEach((val, baseName) => {
    if (val.mp4 && val.txt) {
      const rawTxtContent = fs.readFileSync(val.txt, "utf-8").trim();

      observations.push({
        id: `obs-${index}`,
        code: baseName,
        videoUrl: val.mp4,
        description: rawTxtContent,
        severity:
          index % 4 === 0
            ? "Critical"
            : index % 3 === 0
            ? "High"
            : index % 2 === 0
            ? "Medium"
            : "Low",
        status: "open",
        timestamp: new Date().toISOString(),
      });
      index++;
    }
  });

  fs.writeFileSync(jsonOutputPath, JSON.stringify(observations, null, 2));
  console.log(`✅ Success! Created public/observations.json with ${observations.length} matched clips.`);
}

processZipAndGenerateIndex().catch(console.error);
