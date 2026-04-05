import { GlobalProvider } from "@ladle/react";
import './style.css';
import React, { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const Provider: GlobalProvider = ({ children }) => {
  const [header] = useState(() => document.createElement('div'));

  const toggle = useCallback(() => {
    if (!header.parentElement) return;
    header.parentElement.classList.toggle('hide')
  }, [])

  const hide = useCallback((e: any)=>{ // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!header.parentElement) return;
    if(e.target.nodeName !== 'A') return;
    header.parentElement.classList.add('hide')
  }, [])

  useEffect(() => {
    const container = document.querySelector('.ladle-aside');
    if (!container) return;
    container.prepend(header);
    container.classList.add('hide');
    container.addEventListener('click', hide)
    return () => {
      header.remove();
      container.removeEventListener('click', hide)
    }
  }, [])
  return <>
    {createPortal(<Header toggle={toggle} />, header)}
    {children}
  </>
}

interface HeaderProps {
  toggle: () => void;
}

const Header = memo<HeaderProps>(({ toggle }) => {
  return <>
    <button className="story-menu-btn" onClick={toggle}>&#9776;</button>
    <h1>react-babylon-map</h1>
    <div style={{ paddingBottom: 15 }} className="story-header">
      <p>Babylon.js inside Mapbox & Maplibre</p>
    </div>
  </>
})
Header.displayName = 'Header';
