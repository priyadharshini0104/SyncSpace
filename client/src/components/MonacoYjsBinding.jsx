import React, { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
export default function useMonacoYjs({ editorRef, ydoc, awareness, fieldName = 'monaco' }) {
  const bindingRef = useRef(null);
  useEffect(() => {
    if (!editorRef || !ydoc) return;
    const ytext = ydoc.getText(fieldName);
    const model = editorRef.getModel();
    if (model && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        ytext,
        model,
        new Set([editorRef]),
        awareness
      );
    }
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [editorRef, ydoc, awareness, fieldName]);
  return bindingRef;
}
