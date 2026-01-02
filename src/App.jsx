import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./fonts/NotoNaskhArabic";

const N8N_WEBHOOK_URL =
  "https://nebukanexusai.app.n8n.cloud/webhook/extract-pdf";

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [downloadType, setDownloadType] = useState("pdf");
  const [dragActive, setDragActive] = useState(false);

  const fixRTL = (text) =>
    text
      .split("\n")
      .map((line) => line.split(" ").reverse().join(" "))
      .join("\n");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      if (f.type !== "application/pdf") {
        return toast.error("Please upload PDF files only");
      }
      setFile(f);
      toast.success("File added successfully");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    if (loading) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setResultText(
        data.resultText ||
        data.statusText ||
        data.message ||
        JSON.stringify(data, null, 2)
      );

      toast.success("Extraction completed");
    } catch {
      toast.error("Upload failed — please check n8n or CORS settings");
    } finally {
      setLoading(false);
    }
  };


  const generatePDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("NotoNaskhArabic", "normal");
    doc.setFontSize(12);

    const rtlText = fixRTL(resultText);
    const lines = doc.splitTextToSize(rtlText, 180);

    let y = 20;
    const lineHeight = 7;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 195, y, { align: "right" });
      y += lineHeight;
    });

    doc.save("result.pdf");
  };

  const generateDOCX = async () => {
    const paragraphs = resultText.split("\n").map(
      (line) =>
        new Paragraph({
          bidirectional: true,
          rightToLeft: true,
          children: [
            new TextRun({
              text: line,
              size: 28,
            }),
          ],
        })
    );

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "result.docx");
  };

  const handleDownload = () => {
    if (!resultText) return toast.error("No extraction result available");
    downloadType === "pdf" ? generatePDF() : generateDOCX();
  };

  return (
    <div className="min-h-screen bg-gradient-to-tl from-green-500 from-0% via-emerald-300 via-50% to-green-400 to-100% flex items-center justify-center px-4">
      <Toaster />

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-white/30 p-8">
        <h1 className="text-3xl font-bold text-emerald-600 text-center mb-2">
          PDF Extraction Portal
        </h1>

        <p className="text-emerald-600 text-center mb-6">
          Upload a PDF — n8n extracts text — download result as PDF or DOCX
        </p>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition
          ${dragActive
              ? "border-emerald-400 bg-white/50"
              : "border-emerald-600 bg-white"
            }`}
        >
          <div className="text-slate-700">
            <div className="text-4xl mb-2">☁️</div>
            <p className="font-medium">Drag & drop to upload</p>
            <p className="text-sm my-1 text-slate-500">or</p>

            <label className="inline-block mt-2">
              <span className="px-4 py-2 rounded-lg bg-emerald-600 text-white cursor-pointer">
                Browse Computer
              </span>
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.type !== "application/pdf")
                    return toast.error("Please upload PDF files only");
                  setFile(f);
                  toast.success("File selected successfully");
                }}
              />
            </label>

            {file && (
              <p className="mt-3 text-emerald-700 text-sm">
                {file.name}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className={`mt-5 w-full py-3 rounded-lg font-semibold text-white transition
            ${!file || loading
              ? "bg-slate-500 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700"
            }`}
        >
          {loading ? "Processing..." : "Upload & Extract"}
        </button>

        {resultText && (
          <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-3">Extraction Result</h2>

            <div className="p-4 bg-slate-100 rounded-lg max-h-60 overflow-auto whitespace-pre-line">
              {resultText}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <select
                value={downloadType}
                onChange={(e) => setDownloadType(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="pdf">Download as PDF</option>
                <option value="docx">Download as DOCX</option>
              </select>

              <button
                onClick={handleDownload}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
