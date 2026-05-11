import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, degrees } from "pdf-lib";
import Swal from "sweetalert2";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ======================================
// PDF WORKER
// ======================================

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function App() {
  // ======================================
  // STATES
  // ======================================

  const [pdfFile, setPdfFile] =
    useState(null);

  const [pdfBytes, setPdfBytes] =
    useState(null);

  const [numPages, setNumPages] =
    useState(0);

  const [signature, setSignature] =
    useState(null);

  const [signatureFile, setSignatureFile] =
    useState(null);

  const [signatureData, setSignatureData] =
    useState({
      x: 100,
      y: 100,
      page: 1,
    });

  const [dragging, setDragging] =
    useState(false);

  const [rotating, setRotating] =
    useState(false);

  const [rotation, setRotation] =
    useState(0);

  // ======================================
  // CONFIG
  // ======================================

  const signatureWidth = 180;
  const signatureHeight = 90;

  const COLORS = {
    primary: "#ff6b00",
    secondary: "#ff8c42",
    dark: "#030712",
    darkBlue: "#07132b",
    text: "#ffffff",
    text2: "#9ca3af",
    border: "rgba(255,255,255,0.08)",
    glass: "rgba(255,255,255,0.05)",
  };

  // ======================================
  // PDF UPLOAD
  // ======================================

  const handlePdfUpload = async (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      const url =
        URL.createObjectURL(file);

      setPdfFile(url);

      const bytes =
        await file.arrayBuffer();

      setPdfBytes(bytes);
    } catch (error) {
      console.log(error);
    }
  };

  // ======================================
  // SIGNATURE UPLOAD
  // ======================================

  const handleSignatureUpload = (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      setSignatureFile(file);

      const imageUrl =
        URL.createObjectURL(file);

      setSignature(imageUrl);
    } catch (error) {
      console.log(error);
    }
  };

  // ======================================
  // CLICK TO PLACE
  // ======================================

  const handlePageClick = (
    e,
    pageNumber
  ) => {
    if (
      !signature ||
      dragging ||
      rotating
    )
      return;

    const rect =
      e.currentTarget.getBoundingClientRect();

    let x = e.clientX - rect.left;

    let y = e.clientY - rect.top;

    // KEEP INSIDE PDF

    x = Math.max(
      0,
      Math.min(
        x,
        rect.width - signatureWidth
      )
    );

    y = Math.max(
      0,
      Math.min(
        y,
        rect.height - signatureHeight
      )
    );

    setSignatureData({
      x,
      y,
      page: pageNumber,
    });
  };

  // ======================================
  // DRAG START
  // ======================================

  const handleDragStart = (e) => {
    e.stopPropagation();

    setDragging(true);
  };

  // ======================================
  // ROTATE START
  // ======================================

  const handleRotateStart = (e) => {
    e.stopPropagation();

    setRotating(true);
  };

  // ======================================
  // MOUSE MOVE
  // ======================================

  const handleMouseMove = (
    e,
    pageNumber
  ) => {
    const rect =
      e.currentTarget.getBoundingClientRect();

    // DRAGGING

    if (
      dragging &&
      signatureData.page === pageNumber
    ) {
      let x = e.clientX - rect.left;

      let y = e.clientY - rect.top;

      // KEEP INSIDE PDF

      x = Math.max(
        0,
        Math.min(
          x,
          rect.width - signatureWidth
        )
      );

      y = Math.max(
        0,
        Math.min(
          y,
          rect.height -
            signatureHeight
        )
      );

      setSignatureData((prev) => ({
        ...prev,
        x,
        y,
      }));
    }

    // ROTATION

    if (
      rotating &&
      signatureData.page === pageNumber
    ) {
      const centerX =
        signatureData.x +
        signatureWidth / 2;

      const centerY =
        signatureData.y +
        signatureHeight / 2;

      const mouseX =
        e.clientX - rect.left;

      const mouseY =
        e.clientY - rect.top;

      const angle =
        Math.atan2(
          mouseY - centerY,
          mouseX - centerX
        ) *
        (180 / Math.PI);

      setRotation(angle);
    }
  };

  // ======================================
  // STOP ACTIONS
  // ======================================

  const handleMouseUp = () => {
    setDragging(false);

    setRotating(false);
  };

  // ======================================
  // SAVE PDF
  // ======================================

  const handleSavePdf = async () => {
    try {
      if (!pdfBytes) {
        Swal.fire({
          icon: "warning",
          title: "Upload PDF",
          text:
            "Please upload PDF first",
          background: "#0f172a",
          color: "#fff",
        });

        return;
      }

      if (!signatureFile) {
        Swal.fire({
          icon: "warning",
          title:
            "Upload Signature",
          text:
            "Please upload signature first",
          background: "#0f172a",
          color: "#fff",
        });

        return;
      }

      const pdfDoc =
        await PDFDocument.load(pdfBytes);

      const pages = pdfDoc.getPages();

      const selectedPage =
        pages[signatureData.page - 1];

      const pdfWidth =
        selectedPage.getWidth();

      const pdfHeight =
        selectedPage.getHeight();

      const renderedWidth = 1000;

      const scale =
        pdfWidth / renderedWidth;

      const signatureBytes =
        await signatureFile.arrayBuffer();

      let image;

      if (
        signatureFile.type.includes("png")
      ) {
        image = await pdfDoc.embedPng(
          signatureBytes
        );
      } else {
        image = await pdfDoc.embedJpg(
          signatureBytes
        );
      }

      const imageWidth =
        signatureWidth * scale;

      const imageHeight =
        signatureHeight * scale;

      const pdfX =
        signatureData.x * scale;

      const pdfY =
        pdfHeight -
        signatureData.y * scale -
        imageHeight;

      selectedPage.drawImage(image, {
        x: pdfX,
        y: pdfY,
        width: imageWidth,
        height: imageHeight,
        rotate: degrees(rotation),
      });

      const modifiedPdf =
        await pdfDoc.save();

      const blob = new Blob(
        [modifiedPdf],
        {
          type: "application/pdf",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      const { value: fileName } =
        await Swal.fire({
          title: "Enter file name",
          input: "text",
          inputValue:
            "hts-forge-signed",
          showCancelButton: true,
          confirmButtonText:
            "Download",
          background: "#0f172a",
          color: "#fff",
        });

      if (!fileName) return;

      a.href = url;

      a.download = `${fileName}.pdf`;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Downloaded",
        text:
          "PDF downloaded successfully",
        background: "#0f172a",
        color: "#fff",
      });
    } catch (error) {
      console.log(error);
    }
  };

  // ======================================
  // BUTTON STYLES
  // ======================================

  const primaryButton = {
    width: "100%",
    height: "56px",
    border: "none",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg,#ff6b00,#ff8c42)",
    color: "white",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow:
      "0 15px 40px rgba(255,107,0,0.35)",
  };

  const secondaryButton = {
    width: "100%",
    height: "52px",
    borderRadius: "16px",
    border: `1px solid ${COLORS.border}`,
    background:
      "rgba(255,255,255,0.04)",
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",

        // ======================================
        // HTS FORGE BACKGROUND
        // ======================================

        background: `
          radial-gradient(circle at top left, rgba(255,107,0,0.45), transparent 22%),
          radial-gradient(circle at 20% 30%, rgba(255,107,0,0.18), transparent 18%),
          radial-gradient(circle at bottom right, rgba(0,56,255,0.22), transparent 28%),
          linear-gradient(135deg,#050816 0%, #020617 45%, #07132b 100%)
        `,
      }}
    >
      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "48px",
              color: "white",
              margin: 0,
              fontWeight: "900",
              letterSpacing: "-1px",
              textShadow:
                "0 0 25px rgba(255,107,0,0.25)",
            }}
          >
            HTS Forge PDF Studio
          </h1>

          <p
            style={{
              color: COLORS.text2,
              marginTop: "10px",
              fontSize: "15px",
            }}
          >
            Enterprise PDF Signing Platform
          </p>
        </div>

        <div
          style={{
            padding: "12px 24px",
            borderRadius: "999px",
            background:
              "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.primary,
            fontWeight: "700",
            backdropFilter: "blur(10px)",
            boxShadow:
              "0 10px 30px rgba(255,107,0,0.12)",
          }}
        >
          Hybrid Tech Studio
        </div>
      </div>

      {/* ====================================== */}
      {/* MAIN LAYOUT */}
      {/* ====================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "320px 1fr",
          gap: "24px",
          height: "calc(100vh - 120px)",
        }}
      >
        {/* ====================================== */}
        {/* SIDEBAR */}
        {/* ====================================== */}

        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",

            backdropFilter: "blur(18px)",

            border: `1px solid ${COLORS.border}`,

            borderRadius: "30px",

            padding: "24px",

            overflow: "hidden",

            boxSizing: "border-box",

            boxShadow: `
              0 20px 60px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          <h2
            style={{
              color: "white",
              marginTop: 0,
              fontSize: "34px",
              marginBottom: "8px",
            }}
          >
            Workspace
          </h2>

          <p
            style={{
              color: COLORS.text2,
              marginBottom: "28px",
            }}
          >
            Upload & manage documents
          </p>

          {/* PDF UPLOAD */}

          <label
            style={{
              display: "block",

              padding: "26px",

              borderRadius: "26px",

              border:
                "2px dashed rgba(255,255,255,0.08)",

              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",

              marginBottom: "20px",

              cursor: "pointer",

              transition: "0.3s",

              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "46px",
                  marginBottom: "12px",
                }}
              >
                📄
              </div>

              <h3
                style={{
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                Upload PDF
              </h3>

              <p
                style={{
                  color: COLORS.text2,
                  fontSize: "13px",
                }}
              >
                Select your document
              </p>
            </div>

            <input
              hidden
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
            />
          </label>

          {/* SIGNATURE */}

          <label
            style={{
              display: "block",

              padding: "26px",

              borderRadius: "26px",

              border:
                "2px dashed rgba(255,255,255,0.08)",

              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",

              marginBottom: "28px",

              cursor: "pointer",
            }}
          >
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "46px",
                  marginBottom: "12px",
                }}
              >
                ✍️
              </div>

              <h3
                style={{
                  color: "white",
                  marginBottom: "8px",
                }}
              >
                Upload Signature
              </h3>

              <p
                style={{
                  color: COLORS.text2,
                  fontSize: "13px",
                }}
              >
                PNG / JPG supported
              </p>
            </div>

            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              onChange={
                handleSignatureUpload
              }
            />
          </label>

          {/* BUTTONS */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <button
              style={secondaryButton}
              onClick={() =>
                setRotation(
                  (prev) => prev - 90
                )
              }
            >
              Rotate Left
            </button>

            <button
              style={secondaryButton}
              onClick={() =>
                setRotation(
                  (prev) => prev + 90
                )
              }
            >
              Rotate Right
            </button>

            <button
              style={primaryButton}
              onClick={handleSavePdf}
            >
              Save & Download
            </button>
          </div>
        </div>

        {/* ====================================== */}
        {/* PDF AREA */}
        {/* ====================================== */}

        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",

            backdropFilter: "blur(18px)",

            border: `1px solid ${COLORS.border}`,

            borderRadius: "30px",

            padding: "26px",

            overflowY: "auto",

            overflowX: "hidden",

            boxSizing: "border-box",

            boxShadow: `
              0 20px 60px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          {!pdfFile && (
            <div
              style={{
                height: "100%",
                display: "flex",
                justifyContent:
                  "center",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "90px",
                  marginBottom: "24px",
                  filter:
                    "drop-shadow(0 0 25px rgba(255,107,0,0.45))",
                }}
              >
                🔥
              </div>

              <h2
                style={{
                  color: "white",
                  fontSize: "48px",
                  marginBottom: "10px",
                  fontWeight: "900",
                }}
              >
                HTS Forge
              </h2>

              <p
                style={{
                  color: COLORS.text2,
                }}
              >
                Upload PDF to begin
              </p>
            </div>
          )}

          {pdfFile && (
            <Document
              file={pdfFile}
              onLoadSuccess={({
                numPages,
              }) =>
                setNumPages(numPages)
              }
            >
              {Array.from(
                new Array(numPages),
                (_, index) => {
                  const pageNumber =
                    index + 1;

                  return (
                    <div
                      key={pageNumber}
                      style={{
                        display: "flex",
                        justifyContent:
                          "center",
                        marginBottom:
                          "40px",
                      }}
                    >
                      <div
                        onClick={(e) =>
                          handlePageClick(
                            e,
                            pageNumber
                          )
                        }
                        onMouseMove={(e) =>
                          handleMouseMove(
                            e,
                            pageNumber
                          )
                        }
                        onMouseUp={
                          handleMouseUp
                        }
                        onMouseLeave={
                          handleMouseUp
                        }
                        style={{
                          position:
                            "relative",

                          width: "1000px",

                          overflow: "hidden",

                          borderRadius:
                            "14px",

                          boxShadow:
                            "0 25px 80px rgba(0,0,0,0.55)",
                        }}
                      >
                        <Page
                          pageNumber={
                            pageNumber
                          }
                          width={1000}
                          renderTextLayer={
                            false
                          }
                          renderAnnotationLayer={
                            false
                          }
                        />

                        {/* SIGNATURE */}

                        {signature &&
                          signatureData.page ===
                            pageNumber && (
                            <div
                              style={{
                                position:
                                  "absolute",

                                left: `${signatureData.x}px`,

                                top: `${signatureData.y}px`,

                                width: `${signatureWidth}px`,

                                height: `${signatureHeight}px`,

                                transform: `rotate(${rotation}deg)`,

                                transformOrigin:
                                  "center",

                                zIndex: 999,
                              }}
                            >
                              <img
                                src={
                                  signature
                                }
                                alt="signature"
                                draggable={
                                  false
                                }
                                onMouseDown={
                                  handleDragStart
                                }
                                style={{
                                  width:
                                    "100%",

                                  height:
                                    "100%",

                                  background:
                                    "white",

                                  border:
                                    "2px solid #ff6b00",

                                  borderRadius:
                                    "14px",

                                  padding:
                                    "6px",

                                  cursor:
                                    "move",

                                  userSelect:
                                    "none",

                                  boxShadow:
                                    `
                                      0 0 25px rgba(255,107,0,0.45),
                                      0 0 50px rgba(255,107,0,0.25)
                                    `,
                                }}
                              />

                              {/* ROTATE HANDLE */}

                              <div
                                onMouseDown={
                                  handleRotateStart
                                }
                                style={{
                                  position:
                                    "absolute",

                                  right:
                                    "-12px",

                                  top: "-12px",

                                  width:
                                    "24px",

                                  height:
                                    "24px",

                                  borderRadius:
                                    "50%",

                                  background:
                                    COLORS.primary,

                                  border:
                                    "3px solid white",

                                  cursor:
                                    "grab",

                                  boxShadow:
                                    "0 0 15px rgba(255,107,0,0.6)",
                                }}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }
              )}
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}