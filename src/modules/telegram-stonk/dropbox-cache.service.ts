import { Injectable } from "@nestjs/common";
import path from "path";
import fs from "fs";
import unzipper from "unzipper";
import { zip } from "zip-a-folder";
import { COOKIES_DROPBOX_PATH, COOKIES_PATH, DROPBOX_KEY } from "@env/config";
import dropboxV2Api from "dropbox-v2-api";
import { Readable, Writable } from "stream";

@Injectable()
export class DropboxCacheService {
  dropbox = dropboxV2Api.authenticate({
    token: DROPBOX_KEY,
  });

  streamToString(): [Promise<string>, (error) => void, Writable] {
    const chunks = [];
    let resolve;
    let resolved = false;
    let markError = (error) => {
      !resolved && resolve("");
      resolved = true;
    };
    const promise = new Promise<string>((r) => (resolve = r));
    const stream = new Writable({
      write: (chunk, encoding, next) => {
        chunks.push(chunk);
        next();
      },
      final: (cb) => {
        !resolved && resolve(Buffer.concat(chunks).toString("utf8"));
        resolved = true;
        cb();
      },
    });
    stream.on("error", () => {
      !resolved && resolve("");
      resolved = true;
    });
    return [promise, markError, stream];
  }

  async saveFolder(localPath: string, fileDropboxPath: string) {
    const tmpZip = path.resolve("./tmp.zip");
    if (fs.existsSync(tmpZip)) {
      fs.unlinkSync(tmpZip);
    }
    await zip(localPath, tmpZip);
    return await new Promise<boolean>((r) => {
      this.dropbox(
        {
          resource: "files/upload",
          parameters: {
            path: fileDropboxPath,
            mode: "overwrite",
          },
          readStream: fs.createReadStream(tmpZip),
        },
        (err) => {
          if (err) {
            console.error(err);
            r(false);
          } else {
            r(true);
          }
        }
      );
    });
  }

  async getFolder(localPath: string, fileDropboxPath: string) {
    let resolve: () => void;
    let promise = new Promise<void>((r) => (resolve = r));

    const tmpZip = path.resolve("./tmp.zip");
    if (fs.existsSync(tmpZip)) {
      fs.unlinkSync(tmpZip);
    }

    if (fs.existsSync(localPath)) {
      // rimraf.sync(localPath);
      fs.rmdirSync(localPath, { recursive: true });
    }

    const stream = fs.createWriteStream(tmpZip).on("finish", () => resolve());

    this.dropbox(
      {
        resource: "files/download",
        parameters: {
          path: fileDropboxPath,
        },
      },
      (err) => {
        if (err) {
          console.error(err);
        }
      }
    ).pipe(stream);

    await promise;

    promise = new Promise<void>((r) => (resolve = r));
    fs.createReadStream(tmpZip)
      .pipe(unzipper.Extract({ path: localPath }))
      .on("finish", () => resolve());
    await promise;

    fs.unlinkSync(tmpZip);
  }

  async saveData(data: string, fileDropboxPath: string) {
    return await new Promise<boolean>((r) => {
      this.dropbox(
        {
          resource: "files/upload",
          parameters: {
            path: fileDropboxPath,
            mode: "overwrite",
          },
          readStream: Readable.from([data]),
        },
        (err) => {
          if (err) {
            console.error(err);
            r(false);
          } else {
            r(true);
          }
        }
      );
    });
  }

  getData(fileDropboxPath: string) {
    const [promise, markError, stream] = this.streamToString();
    this.dropbox(
      {
        resource: "files/download",
        parameters: {
          path: fileDropboxPath,
        },
      },
      (err) => {
        if (err) {
          console.error(err);
          markError(err);
        }
      }
    ).pipe(stream);
    return promise;
  }

  async readSessionFromDropbox() {
    const fileStr = await this.getData(COOKIES_DROPBOX_PATH);
    fs.writeFileSync(COOKIES_PATH, fileStr);
    return true;
  }

  async writeSessionToDropbox() {
    await this.saveData(
      fs
        .readFileSync(COOKIES_PATH, {
          encoding: "utf-8",
        })
        .toString(),
      COOKIES_DROPBOX_PATH
    );
    return true;
  }
}
