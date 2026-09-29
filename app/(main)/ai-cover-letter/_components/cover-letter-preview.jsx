"use client";

import React from "react";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";

const CoverLetterPreview = ({ content }) => {
  return (
    <div className="py-4">
      <MDEditor
        value={content}
        preview="preview"
        height={700}
        previewOptions={{
          // Strip any dangerous HTML (script tags, event handlers, javascript: URLs)
          // from the rendered markdown before it reaches the DOM.
          rehypePlugins: [[rehypeSanitize]],
        }}
      />
    </div>
  );
};

export default CoverLetterPreview;