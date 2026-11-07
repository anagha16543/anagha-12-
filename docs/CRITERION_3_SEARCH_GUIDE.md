---
title: "Criterion 3: Evidence Search (RAG) in Simple Words"
---

**Where:** Criterion 3 page → tab **AI Advisory & RAG** → box **Evidence Semantic Search** → type → click **Search**.

# What it does

You type a question. The system looks inside the **text of the files you uploaded** and shows the best matching file, the page, and a piece of its text. Use it to answer: **"Which document proves this?"**

It only finds documents that are already uploaded. Upload the 8 files first.

# What to type for each section

| Section | Type this | You should see first |
|---|---|---|
| 3.1 Course outcomes | `CO-PO mapping course outcomes` | `3.1_Course_File_CS501…pdf` |
| 3.2 Question paper | `question paper Bloom level` | `3.2_SEE_Question_Paper…pdf` |
| 3.3 Lab work | `lab experiments safety` | `3.3_Lab_Manual_and_Records…docx` |
| 3.4 Internship | `internship duration companies` | `3.4_Internship_Summary…docx` |
| 3.5 Projects | `project rubric team scores` | `3.5_Project_Evaluation_Sheet.xlsx` |
| 3.6 SDG | `SDG zero hunger` | `3.6_SDG_Mapping_Report.docx` |
| 3.7 CO attainment | `students meeting target attainment weak` | `3.7_CO_Attainment_Sheet.xlsx` |
| 3.8 PO/PSO attainment | `PO PSO average level` | `3.8_PO_PSO_Attainment_Sheet.xlsx` |

Each result shows: the **file name**, the **page**, a **Sim %** and a short piece of the text.
(The best match is always shown as 100%. The other results are scored against it. It is a ranking, not a quality score.)

# Tips

- Use words that are **really inside** the document (for example `Bloom`, `SDG`, `internship`). The search matches words, not meaning.
- Short is better: 2 to 4 words.
- If nothing sensible appears, the file is probably not uploaded yet. Check the **Evidence Documents** tab.

# The other button: Assessment AI Agent Review

This button asks an AI to read the Criterion 3 data and write advice. **It needs a free Groq key.** Without one it shows:
*"Assessment Agent Advisory (status: UNAVAILABLE) AI service returned HTTP 500."*
That message is expected until a key is added. The search above does **not** need the key. The AI advice never changes a score.
