import { describe, expect, it } from "vitest";
import { districtOf, heightToCm, parseBiodataText, yearOf } from "@/lib/biodata-import/parse";

// Four real shapes of biodata families hand to a ghotok, typed out the way Word, a PDF or OCR would give them.

const MISKATUL = `
Personal/Bride Details of
Miskatul Zannat
Miskatul Zannat
Basic Information:
Date of birth 10 December, 1995.
Blood O+
Weight 45 Kg
Eye & Hear Color Black
Religion-Islam (Sunni)
Single

Job Experience:
• Teachers Govt. Primary school ( Year 2024 to till)
Education:
• Masters
Dhaka University (Year-2021)
• Honurs
Dhaka University (Year-2015)
• Higher Secondary School Certificate (HSC)
Lohagara Adarsha College, Narail (Year-2013)

Present Address:
House: 78, Ward: 3, Sarkarpara, Post.:
Lohagara, P.O.: Lohagara, Dist.: Narail.

Family:
Father: Md. Mizanur Rahman (Former Subeder, BGB-Rtd. 2017)
Mother's: Mrs. Nazma Rahman (House Wife)
Elder Brother: Enamul Haque (married)
Private service Holder.
Younger Sister's : Rowjatul Jannat (Unmarried)
Masters Continuing from Home Economics College.
Permanent Address:
House: 78, Ward: 3, Sarkarpara, Post.:
Lohagara, P.O.: Lohagara, Dist.: Narail
`;

const SAMIRA = `
BIO-DATA
Personal Information
Name: Samira Yasmin
Date of Birth: 08 May 2002
Complexion: Wheatish
Blood Group: A+
Religion: Islam Nationality:
Bangladeshi Marital
Status: Unmarried

Address
Present Address: Azimpur, Dhaka
Permanent Address: Kashiani, Gopalganj

Educational Qualification
Honours (Current)
4th Year, Department of Sociology
Eden Mohila College, Dhaka
Higher Secondary Certificate (HSC)
Passed in 2020

Family Details
Father: Md. Delowar Hossain, Businessman (B.A.); lived in Saudi Arabia for 25
years
Mother: Sabina Yasmin, Assistant Teacher, Government Primary School (B.A.)

Siblings:
• One Sister – Honours (1st Year)
• One Brother – Class Nine
`;

const SHILPI = `
জীবন বৃত্তান্ত
পরিচয়ঃ
নাম ঃ মোসাঃ শিল্পী খানম
উচ্চতা ঃ ৫'৩" ইঞ্চি
ওজন ঃ ৫২ কেজি
জন্মস্থান ঃ চরভাটপাড়া,কাশিয়ানী,গোপালগঞ্জ ।
বর্তমান ঠিকানা ঃ চরভাটপাড়া,কাশিয়ানী,গোপালগঞ্জ ।
যোগ্যতাঃ
পদের নাম ঃ ষাট-কাম-কম্পিউটার মুদ্রাক্ষরিক ।
কর্মস্থল ঃ চরভাটাপাড়া উচ্চ বিদ্যালয় ।
চাকুরী ঃ সরকারী
পারিবারিক পরিচয়ঃ
বাবার নাম ঃ মোঃ বাদশা শেখ(বড়বাড়ী)
মাতার নাম ঃ রাণী আক্তার(রীনা)
যোগাযোগঃ
ঠিকানা ঃ চরভাটপাড়া,কাশিয়ানী,গোপালগঞ্জ ।
মোবাইল নং ঃ ০১৯২৪৮৪৮৫০২
`;

const JANNATUL = `
CONTACT
+8801881092657
jannatulferdoushi356@gmail.com
PERMANENT ADDRESS
Village: Chhayna
Post office: Madaripur
Police station: Madaripur
District: Madaripur
PRESENT ADDRESS
Habibullah road, Ibrahimpur,
kochukhet, Dhaka Cantonment
BASIC INDO
Date of Birth: 06 Oct 2001
Height: 5' 4"
Weight: 47 KG
Religion: Muslim
Blood group: 0+
EDUCATION
Bachelor of Science in Textile
Engineering
INSTITUTION
Shyamoli textile engineering college constitution of University of Dhaka (2020-2024)
CGPA 3.71
MST. JANNATL FERDOUSHI
ABOUT ME
Assalamualaikum,
I'm from a well mannered, middle class family. am a straightforward and dedicated person. I prefer someone with a strong personality, who is straightforward, has good character, shows respect to me and my family, and patient.
INTERESTED AREA
* Art related work
* Photography
FAMILY DETAILS
Father: Sgt. Md Humayun Kabir
Occupation: Army (retired) Currently DGFI HQ, Dhaka Cantonment.
Mather: Mst. Nazmunnaher Lizu
Occupation: Housewife
SIBILING
Ssister: 1. Fatima Tuj Zohura (younger sister)
Student Army Medical College Bogura Cantonment.
`;

describe("reading a biodata file", () => {
  it("converts heights, dates and district spellings", () => {
    expect(heightToCm(`5'3"`)).toBe(160);
    expect(heightToCm("5' 4\"")).toBe(163);
    expect(heightToCm("৫ ফুট ৬ ইঞ্চি")).toBe(168);
    expect(heightToCm("170 cm")).toBe(170);
    expect(heightToCm("tall")).toBeNull();
    expect(yearOf("10 December, 1995.")).toBe(1995);
    expect(yearOf("০৮/০৫/২০০২")).toBe(2002);
    expect(yearOf("nothing")).toBeNull();
    expect(districtOf("Dist.: Narail.")).toBe("নড়াইল");
    expect(districtOf("Gopalgonj")).toBe("গোপালগঞ্জ");
    expect(districtOf("Cox's Bazar")).toBe("কক্সবাজার");
    expect(districtOf("গোপালগঞ্জ")).toBe("গোপালগঞ্জ");
    expect(districtOf("Azimpur")).toBeNull();
  });

  it("reads an English Word-style biodata with a title, sections and a split address", () => {
    const p = parseBiodataText(MISKATUL);
    expect(p).toMatchObject({
      kind: "patri", name: "Miskatul Zannat", birthYear: "1995", religion: "islam", maritalStatus: "obibahito",
      profession: "Teachers Govt. Primary school", district: "নড়াইল", upazila: "Lohagara", village: "Sarkarpara",
      fatherName: "Md. Mizanur Rahman", motherName: "Mrs. Nazma Rahman",
    });
    expect(p.education).toContain("মাস্টার্স");
    expect(p.education).toContain("Dhaka University (2021)");
    for (const line of ["Enamul Haque", "Rowjatul Jannat", "বাবা: Former Subeder, BGB-Rtd. 2017"]) expect(p.familyDetails).toContain(line);
    expect(p).toMatchObject({ bloodGroup: "O+", weightKg: "45" });
    expect(p.guardianPhone).toBeUndefined();
  });

  it("reads a PDF-style biodata whose lines wrap oddly", () => {
    const p = parseBiodataText(SAMIRA);
    expect(p).toMatchObject({ name: "Samira Yasmin", birthYear: "2002", religion: "islam", maritalStatus: "obibahito", district: "গোপালগঞ্জ", upazila: "Kashiani", fatherName: "Md. Delowar Hossain", motherName: "Sabina Yasmin" });
    expect(p.village).toBeUndefined();
    expect(p.education).toContain("অনার্স");
    for (const line of ["One Sister", "বাবা: Businessman"]) expect(p.familyDetails).toContain(line);
    expect(p).toMatchObject({ bloodGroup: "A+", complexion: "ujjol_shyamla" });
  });

  it("reads a Bangla sheet as OCR would type it", () => {
    const p = parseBiodataText(SHILPI);
    expect(p).toMatchObject({
      name: "মোসাঃ শিল্পী খানম", heightCm: "160", district: "গোপালগঞ্জ", upazila: "কাশিয়ানী", village: "চরভাটপাড়া",
      fatherName: "মোঃ বাদশা শেখ", motherName: "রাণী আক্তার", guardianPhone: "01924848502",
    });
    expect(p.profession).toContain("মুদ্রাক্ষরিক");
    expect(p.workplace).toBe("চরভাটাপাড়া উচ্চ বিদ্যালয়");
    expect(p.weightKg).toBe("52");
    expect(p.education).toBeUndefined();
  });

  it("reads a designed CV: labelled address, prose about herself, parents' jobs kept out of her profession", () => {
    const p = parseBiodataText(JANNATUL);
    expect(p).toMatchObject({ birthYear: "2001", heightCm: "163", religion: "islam", district: "মাদারীপুর", upazila: "Madaripur", village: "Chhayna", fatherName: "Sgt. Md Humayun Kabir", guardianPhone: "01881092657" });
    expect(p.profession).toBeUndefined();
    expect(p.expectations).toContain("prefer someone");
    expect(p.education).toContain("অনার্স");
    for (const line of ["Fatima Tuj Zohura", "Occupation: Army (retired)"]) expect(p.familyDetails).toContain(line);
    expect(p.bloodGroup).toBe("O+"); // typed as "0+"
  });

  it("copes with what OCR does to a photo: stray digits, dots for commas, P.0., ® for bullets", () => {
    const p = parseBiodataText("নাম ঃ 8 মোসাঃ শিল্পী খানম 4\nজন্মস্থান ঃ চরভাটপাড়া.কাশিয়ানী:গোপালগঞ্জ ৷\nপদের নাম ঃ মুদ্রাক্ষরিক |\nEducation:\n® Masters\nDhaka University (Year-2021)\nPermanent Address:\nSarkarpara, P.0.: Lohagara, Dist.: Narail.");
    expect(p).toMatchObject({ name: "মোসাঃ শিল্পী খানম", profession: "মুদ্রাক্ষরিক", village: "Sarkarpara", upazila: "Lohagara", district: "নড়াইল" });
    expect(p.education).toBe("মাস্টার্স, Dhaka University (2021)");
    const q = parseBiodataText("জন্মস্থান ঃ চরভাটপাড়া.কাশিয়ানী:গোপালগঞ্জ ৷");
    expect(q).toMatchObject({ village: "চরভাটপাড়া", upazila: "কাশিয়ানী", district: "গোপালগঞ্জ" });
  });

  it("reads the looks, the medium, the workplace, siblings, a present address and the age hoped for", () => {
    const p = parseBiodataText([
      "Name: Rafiq", "Complexion: Fair", "Weight: 68 kg", "Blood Group: O (+ve)", "Medium: Madrasa", "Occupation: Teacher",
      "Workplace: Savar High School", "Permanent Address: Vill: Kushura, Dhamrai, Dist: Dhaka", "Present Address: Mirpur, Dhaka",
      "Family: 2 brothers and 1 sister", "Expectation: age 22 to 28, religious",
    ].join("\n"));
    expect(p).toMatchObject({
      name: "Rafiq", complexion: "forsha", weightKg: "68", bloodGroup: "O+", educationMedium: "madrasa", profession: "Teacher",
      workplace: "Savar High School", village: "Kushura", upazila: "Dhamrai", district: "ঢাকা", presentAddress: "ঢাকা",
      brothers: "2", sisters: "1", expectAgeMin: "22", expectAgeMax: "28",
    });
    // the medium can also come from the degrees, and a blood group without a sign is left out
    expect(parseBiodataText("Education: Dakhil, Alim").educationMedium).toBe("madrasa");
    expect(parseBiodataText("Blood: B").bloodGroup).toBeUndefined();
  });

  it("leaves out what it cannot read instead of guessing", () => {
    expect(parseBiodataText("")).toEqual({});
    const p = parseBiodataText("Name: করিম\nHeight: tall\nDistrict: Mars");
    expect(p).toEqual({ name: "করিম" });
  });
});
