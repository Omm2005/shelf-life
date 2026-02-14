"use client";

import React, { useRef, useState } from "react";

const Page = () => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [texts, setTexts] = useState<Array<string>>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const openBrowseImage = async () => {
    await imageInputRef.current?.click();
  };

  const convert = async (file: File) => {
    if (!file) {
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("OCR request failed");
      }

      const data: { text: string } = await response.json();
      setTexts((prev) => [...prev, data.text]);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-[90vh]">
      <h1 className="text-white text-4xl md:text-6xl text-center px-5 pt-5 font-extrabold ">
        Built With{" "}
        <span className="bg-linear-to-r from-blue-600 via-green-500 to-indigo-400 inline-block text-transparent bg-clip-text">
          Tesseract Js{" "}
        </span>
      </h1>
      <input
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();
          const file = e.target.files?.[0];

          if (file) {
            void convert(file);
          }
        }}
        ref={imageInputRef}
        type="file"
        hidden
        required
      />
      <div className="relative md:bottom-10 w-full flex flex-col gap-10 items-center justify-center p-5 md:p-20">
        <div
          onClick={() => {
            void openBrowseImage();
          }}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];

            if (file) {
              void convert(file);
            }
          }}
          className="w-full min-h-[30vh] md:min-h-[50vh] p-5 bg-[#202020] cursor-pointer rounded-xl flex items-center justify-center"
        >
          <div className="w-full flex items-center justify-center flex-col gap-3">
            <p className="text-2xl md:text-3xl text-center text-[#707070] font-extrabold">
              {processing
                ? "Processing Image..."
                : "Browse Or Drop Your Image Here"}
            </p>
          </div>
        </div>
        <pre className="w-full bg-[#202020] p-5 rounded-xl text-sm md:text-base">
          {texts.join("\n\n")}
        </pre>
      </div>
    </div>
  );
};

export default Page;
