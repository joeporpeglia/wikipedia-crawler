import { Parser } from "htmlparser2";
import http from "http";
import https from "https";

const [startPage] = process.argv.slice(2);
downloadHtml(startPage).then(parseHtml);

export function downloadHtml(url: string) {
  return new Promise<string>((res, rej) => {
    let body = "";
    https.get(url, (response) => {
      response.on("data", (data) => {
        body += data;
      });

      response.on("end", () => res(body));
    });
  });
}

function parseHtml(html: string) {
  let mainContentVisitor = new MainContentVisitor();
  let relatedPageVisitor = new RelatedPageVisitor(([text]) =>
    console.log(text)
  );
  const parser = new Parser(
    {
      onopentag(tag, attribs) {
        mainContentVisitor.onOpen(tag, attribs);
        relatedPageVisitor.onOpen(tag, attribs);
      },
      ontext(text) {
        if (mainContentVisitor.inMainContent()) {
          relatedPageVisitor.onText(text);
        }
      },
      onclosetag(tag) {
        mainContentVisitor.onClose(tag);
        relatedPageVisitor.onClose(tag);
      },
    },
    { decodeEntities: true }
  );
  parser.write(html);
  parser.end();
}

class MainContentVisitor {
  private value = -1;
  inMainContent() {
    return this.value >= 0;
  }
  onOpen(_: string, attributes: { [x: string]: string }) {
    if (attributes["id"] === "mw-content-text") {
      this.value = 0;
    } else if (this.value >= 0) {
      this.value += 1;
    }
  }
  onClose(_: string) {
    if (this.value >= 0) {
      this.value -= 1;
    }
  }
}

class RelatedPageVisitor {
  private value = "";
  handle: (page: [string, string]) => void;
  constructor(handle: (page: [string, string]) => void) {
    this.handle = handle;
  }
  onOpen(tag: string, attributes: { [x: string]: any }) {
    let href = attributes["href"];
    if (tag === "a" && href?.startsWith("/wiki/")) {
      this.value = href;
    }
  }
  onText(text: string) {
    if (this.value) {
      this.handle([text, this.value]);
    }
  }
  onClose(tag: string) {
    if (tag === "a") {
      this.value = "";
    }
  }
}
