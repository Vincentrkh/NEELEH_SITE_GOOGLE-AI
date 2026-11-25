import test from "node:test";
import assert from "node:assert/strict";
import {
  pickString,
  pickLines,
  pickTags,
  localizedCourse,
  localizedPost,
  localizedStaticPage,
} from "./content";
import {
  toFaDigits,
  toEnDigits,
  localeNumber,
  localePrice,
  tierLabel,
  normalizePhone,
  isValidPhone,
} from "./format";
import { localizedSetting } from "./settings";

test("pickString returns localized string with Persian fallback", () => {
  assert.equal(pickString("fa", "سلام", "Hello"), "سلام");
  assert.equal(pickString("en", "سلام", "Hello"), "Hello");
  assert.equal(pickString("en", "سلام", "   "), "سلام");
  assert.equal(pickString("en", "سلام", null), "سلام");
});

test("pickLines and pickTags split and trim cleanly", () => {
  assert.deepEqual(pickLines("fa", "یک\n دو \n\nسه", "One\nTwo"), ["یک", "دو", "سه"]);
  assert.deepEqual(pickLines("en", "یک", "First line\n Second line "), ["First line", "Second line"]);
  assert.deepEqual(pickTags("en", "مبتدی,حضوری", "Beginner, In-person , "), ["Beginner", "In-person"]);
});

test("localizedCourse and localizedPost localize fields cleanly", () => {
  const course = localizedCourse("en", {
    title: "دوره اتوکد",
    titleEn: "AutoCAD Course",
    category: "فاز دو",
    categoryEn: "Phase 2",
    tags: "مبتدی",
    tagsEn: "Beginner,Drafting",
    about: "درباره",
    aboutEn: "About text",
    description: "توضیح",
    descriptionEn: "Short desc",
    outputs: "خروجی ۱",
    outputsEn: "Outcome 1\nOutcome 2",
    prereqs: "ندارد",
    prereqsEn: "None",
  });
  assert.equal(course.title, "AutoCAD Course");
  assert.deepEqual(course.tags, ["Beginner", "Drafting"]);
  assert.deepEqual(course.outputs, ["Outcome 1", "Outcome 2"]);

  const post = localizedPost("en", {
    title: "عنوان",
    titleEn: "",
    excerpt: "خلاصه",
    excerptEn: "Summary",
    content: "متن",
    contentEn: "Body",
  });
  assert.equal(post.title, "عنوان");
  assert.equal(post.excerpt, "Summary");

  const page = localizedStaticPage("en", {
    title: "درباره",
    titleEn: "About",
    excerpt: "خلاصه فارسی",
    excerptEn: null,
    content: "محتوا",
    contentEn: "Content",
  });
  assert.equal(page.excerpt, "");
});

test("digit, number, and price formatters handle FA and EN locales", () => {
  assert.equal(toFaDigits("28+"), "۲۸+");
  assert.equal(toEnDigits("۲۸+"), "28+");
  assert.equal(localeNumber("en", "۹"), "9");
  assert.equal(localeNumber("fa", 1250), "۱,۲۵۰");
  assert.equal(localePrice("fa", 6500000), "۶,۵۰۰,۰۰۰ تومان");
  assert.equal(localePrice("en", 6500000), "6,500,000 Toman");
  assert.equal(localePrice("en", 0), "Contact us");
  assert.equal(tierLabel("en", "BEGINNER"), "Foundation");
  assert.equal(tierLabel("fa", "PRO"), "حرفه‌ای");
});

test("normalizePhone and isValidPhone handle Iranian mobile formats", () => {
  assert.equal(normalizePhone("۰۹۱۲-۱۲۳-۴۵۶۷"), "09121234567");
  assert.equal(normalizePhone("+989121234567"), "09121234567");
  assert.equal(normalizePhone("9121234567"), "09121234567");
  assert.equal(isValidPhone("09121234567"), true);
  assert.equal(isValidPhone("02188000000"), false);
});

test("localizedSetting picks En variant in English mode and falls back to FA", () => {
  const settings = {
    "hero.title": "آکادمی نیله",
    "hero.titleEn": "Neeleh Academy",
    "contact.phone": "۰۲۱-۸۸۰۰۰۰۰۰",
  };
  assert.equal(localizedSetting("fa", settings, "hero.title"), "آکادمی نیله");
  assert.equal(localizedSetting("en", settings, "hero.title"), "Neeleh Academy");
  assert.equal(localizedSetting("en", settings, "contact.phone"), "۰۲۱-۸۸۰۰۰۰۰۰");
});
