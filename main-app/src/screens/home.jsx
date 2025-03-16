import './pixelcanvas'
import "./home.css"
import { Link } from 'react-router-dom'
export default function Home() {
    return (
        <div className='home-body'>
            <main className='home-main'>
                <div className="home-card" style={{ "--active-color": "rgb(100, 117, 173)" }}>
                    <pixel-canvas data-gap="15" data-speed="20" data-colors="#e0f2fe, #7dd3fc, #7dd3fc" data-no-focus></pixel-canvas>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentcolor" viewBox="0 0 24 24"><rect fill="none" height="24" width="24"/><path d="M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8L14,2z M12,10c1.1,0,2,0.9,2,2c0,1.1-0.9,2-2,2s-2-0.9-2-2 C10,10.9,10.9,10,12,10z M16,18H8v-0.57c0-0.81,0.48-1.53,1.22-1.85C10.07,15.21,11.01,15,12,15c0.99,0,1.93,0.21,2.78,0.58 C15.52,15.9,16,16.62,16,17.43V18z"/></svg>
                    <button></button>
                    <h3 className='home-title'>Personal Document Chatbot</h3>
                </div>
                
                <Link to={'/pdf'} style={{ textDecoration: 'none' }}>
                <div className="home-card" style={{ "--active-color": "rgb(100, 117, 173)" }}>
                    <pixel-canvas data-gap="15" data-speed="20" data-colors="#e0f2fe, #7dd3fc, #0ea5e9" data-no-focus></pixel-canvas>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentcolor" viewBox="0 0 24 24"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M18 13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm3 5.5h-2.5V21h-1v-2.5H15v-1h2.5V15h1v2.5H21v1z"/><path d="M11.69 15c.36-.75.84-1.43 1.43-2H7v-2h11c1.07 0 2.09.25 3 .69V5c0-1.1-.9-2-2-2h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h6.69c-.44-.91-.69-1.93-.69-3 0-.34.03-.67.08-1H7v-2h4.69zM12 2.75c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM7 7h10v2H7V7z"/></g></g></svg>
                    <button>PDF</button>
                    <h3 className='home-title'>PDF Generation</h3>
                </div>
                </Link>
            </main>
        </div>
    )
}