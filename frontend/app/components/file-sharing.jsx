import { useState, useRef } from "react";

export const FileSharing = ({ shareFile, fileTransfers }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await shareFile(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      await shareFile(files[0]);
    }
  };

  return (
    <div className="p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Select File
        </button>
        <p className="mt-2 text-sm text-gray-600">
          or drag and drop a file here
        </p>
      </div>

      {fileTransfers?.size > 0 && (
        <div className="mt-4 space-y-2">
          {Array.from(fileTransfers.entries()).map(([fileId, transfer]) => (
            <div key={fileId} className="bg-gray-100 p-3 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-black">{transfer.fileName}</span>
                <span className="text-black">
                  {transfer.type === "upload" ? "Sending" : "Receiving"}(
                  {Math.round((transfer.progress / transfer.total) * 100)}%)
                </span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded">
                <div
                  className="h-full bg-blue-500 rounded text-black"
                  style={{
                    width: `${(transfer.progress / transfer.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
