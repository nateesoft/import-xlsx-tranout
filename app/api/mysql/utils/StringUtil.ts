import CryptoJS from "crypto-js";
import crypto from "crypto";

const SECRET_PASS = process.env.API_SECRET_PASS as string;

const encryptData = (text: string): string | undefined => {
  try {
    const data = CryptoJS.AES.encrypt(JSON.stringify(text), SECRET_PASS).toString();
    return data;
  } catch (error) {
    console.log(error);
  }
};

const decryptData = (text: string): string | undefined => {
  try {
    const bytes = CryptoJS.AES.decrypt(text, SECRET_PASS);
    const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return data;
  } catch (error) {
    console.log(error);
  }
};

const Unicode2ASCII = (unicode: string): string => {
  if (!unicode) return "";
  // Strip invisible/zero-width chars (e.g. U+2063) that latin1/TIS620 columns cannot store
  const cleaned = unicode.replace(/[\u00AD\u034F\u200B-\u200F\u2060-\u206F\uFEFF]/g, "").trim();
  const ascii = cleaned.split("");
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i);
    if (0xe01 <= code && code <= 0xe5b) {
      ascii[i] = String.fromCharCode(code - 0xd60);
    }
  }
  return ascii.join("");
};

const ASCII2Unicode = (ascii: string): string => {
  if (!ascii) return "";
  const unicode = ascii.split("");
  for (let i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    if (0xa1 <= code && code <= 0xfb) {
      unicode[i] = String.fromCharCode(code + 0xd60);
    }
  }
  return unicode.join("");
};

const PrefixFormat = (str: string, padString: string, length: number): string => {
  while (str.length < length) str = padString + str;
  return str;
};

const PrefixZeroFormat = (str: string | number, length: number): string => {
  let result = String(str);
  while (result.length < length) result = "0" + result;
  return result;
};

const generateUUID = (): string => {
  return crypto.randomUUID();
};

export { Unicode2ASCII, ASCII2Unicode, PrefixFormat, PrefixZeroFormat, encryptData, decryptData, generateUUID };
