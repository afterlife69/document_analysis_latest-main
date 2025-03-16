import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SubjectProvider } from "./contexts/SubjectContext";
import Home from "./screens/home";
import PdfHome from "./screens/pdfhome";
import Login from "./screens/login";
import SignUp from "./screens/signup";
import UploadQuestions from "./screens/uploadquestions";
import ViewPDF from "./screens/viewpdf";
import UploadQuestionPaper from "./screens/uploadQP";
import LeaderboardQP from "./screens/leaderboardQP";
import SubjectDetail from "./screens/SubjectDetail";
import DocBot from "./screens/document_analysis/docbot";
import DocManage from "./screens/document_analysis/docmange";
export default function App(){
  return (
    <SubjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/pdf" element={<PdfHome />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/uploadquestions" element={<UploadQuestions />} />
          <Route path="/viewpdf" element={<ViewPDF />} />
          <Route path="/uploadQP" element={<UploadQuestionPaper />} />
          <Route path="/leaderboard" element={<LeaderboardQP />} />
          <Route path="/subject/:id" element={<SubjectDetail />} />
          <Route path="/docbot" element={<DocBot />} />
          <Route path="/docmanage" element={<DocManage />} />
        </Routes>
      </BrowserRouter>
    </SubjectProvider>
  )
}