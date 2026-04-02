import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, type CreateProjectRequest } from "../../../api/projectApi";
import courseApi from "../../../api/courseApi";
import { Plus, Trash2, Calendar, FileText, BookOpen, Box, Clock, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./CreateProject.module.css";

interface Subject {
  id: number;
  code: string;
  name: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subjectId: "",
    deadline: ""
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [milestones, setMilestones] = useState<any[]>([
    { title: "", deadline: "", description: "" }
  ]);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await courseApi.getSubjects();
        const subjectsList = response.data?.data || response.data || [];
        setSubjects(subjectsList);
      } catch (error) {
        console.error('Error loading subjects:', error);
        toast.error('Không thể tải danh sách môn học');
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  // When subject selected, update subjectId
  const handleSubjectChange = (subjectCode: string) => {
    setFormData(prev => ({
      ...prev,
      subjectId: subjectCode
    }));
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: "", deadline: "", description: "" }]);
  };

  const handleRemoveMilestone = (index: number) => {
    const newMs = milestones.filter((_, i) => i !== index);
    setMilestones(newMs);
  };

  const handleMilestoneChange = (index: number, field: string, value: string) => {
    const newMs = [...milestones];
    newMs[index][field] = value;
    setMilestones(newMs);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if(!formData.name) return toast.error("Vui lòng điền tên đề tài.");
    if(!formData.subjectId) return toast.error("Vui lòng chọn môn học.");
    const validMilestones = milestones.filter(m => m.title && m.deadline);
    if(validMilestones.length === 0) return toast.error("Vui lòng tạo ít nhất một cột mốc có tên và hạn chót.");

    try {
        // Format milestones theo đúng backend yêu cầu
        const formattedMilestones = validMilestones.map((m, index) => ({
            title: m.title,
            description: m.description || "",
            orderIndex: index,
            deadline: m.deadline ? new Date(m.deadline).toISOString() : null,
            questions: []
        }));

        const payload = {
            subjectId: formData.subjectId,
            name: formData.name,
            description: formData.description || "",
            deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
            milestones: formattedMilestones
        };
        
        const response = await createProject(payload as unknown as CreateProjectRequest);
        await response.data; // Ensure request completes
        
        toast.success("Tạo dự án và thiết lập lộ trình thành công!");
        navigate("/lecturer/projects");
    } catch (error) {
        console.error(error);
        toast.error("Lỗi khi tạo dự án. Vui lòng thử lại.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageInner}>
        <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Khởi Tạo Đề Tài Mới</h1>
            <p className={styles.pageSubtitle}>Thiết lập thông tin dự án và xây dựng lộ trình thực hiện cho sinh viên.</p>
        </div>

        <div className={styles.formCard}>
            <div className={styles.twoPanelGrid}>
                
                {/* CỘT TRÁI: THÔNG TIN CHUNG */}
                <div className={styles.basicInfoPanel}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}><Box size={20}/></div>
                        <h3 className={styles.sectionTitle}>Thông tin cơ bản</h3>
                    </div>

                    <div className={styles.formFields}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Tên đề tài <span className={styles.required}>*</span></label>
                            <div className={styles.inputWrapper}>
                                <FileText size={18} color="#9ca3af"/>
                                <input 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className={styles.input}
                                    placeholder="Ví dụ: Xây dựng hệ thống CRM..."
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Môn học <span className={styles.required}>*</span></label>
                            <div className={styles.inputWrapper}>
                                <BookOpen size={18} color="#9ca3af"/>
                                <select 
                                    value={formData.subjectId || ""}
                                    onChange={e => handleSubjectChange(e.target.value)}
                                    className={styles.select}
                                    disabled={loadingSubjects}
                                >
                                    <option value="">{loadingSubjects ? "Đang tải..." : "-- Chọn môn học --"}</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.code}>
                                            {subject.code} - {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className={styles.helpText}>
                                💡 Trưởng phòng sẽ phân công lớp học sau khi duyệt đề tài
                            </p>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Hạn nộp tổng <span className={styles.required}>*</span></label>
                            <div className={styles.inputWrapper}>
                                <Calendar size={18} color="#9ca3af"/>
                                <input 
                                    type="date"
                                    value={formData.deadline || ''}
                                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                                    className={styles.input}
                                    placeholder="Chọn hạn nộp tổng"
                                />
                            </div>
                            <p className={styles.helpText}>
                                ⏰ Thời hạn cuối cùng để hoàn thành toàn bộ dự án
                            </p>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Mô tả chi tiết yêu cầu</label>
                            <div className={`${styles.inputWrapper} ${styles.inputTextarea}`}>
                                <FileText size={18} color="#9ca3af" style={{marginTop: 4}}/>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className={styles.textarea}
                                    placeholder="Mô tả mục tiêu, phạm vi và các yêu cầu kỹ thuật của đề tài..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: TIMELINE MILESTONES */}
                <div className={styles.timelinePanel}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIconRed}><Calendar size={20}/></div>
                        <h3 className={styles.sectionTitle}>Lộ trình & Cột mốc</h3>
                    </div>
                    
                    <div className={styles.timelineContainer}>
                        {/* Đường kẻ dọc timeline */}
                        <div className={styles.timelineLine}></div>

                        <div className={styles.milestonesWrapper}>
                            {milestones.map((ms, index) => (
                                <div key={index} className={styles.milestoneItem}>
                                    {/* Node tròn trên timeline */}
                                    <div className={styles.milestoneNode}>
                                        {index + 1}
                                    </div>
                                    
                                    {/* Card nhập liệu milestone */}
                                    <div className={styles.milestoneCard}>
                                        {milestones.length > 1 && (
                                            <button onClick={() => handleRemoveMilestone(index)} className={styles.removeButton} title="Xóa mốc này">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        
                                        <div className={styles.milestoneFields}>
                                            <div>
                                                <label className={styles.labelSmall}>Tên giai đoạn <span className={styles.required}>*</span></label>
                                                <input 
                                                    value={ms.title}
                                                    onChange={e => handleMilestoneChange(index, 'title', e.target.value)}
                                                    placeholder="VD: Nộp báo cáo Requirement"
                                                    className={styles.milestoneInput}
                                                />
                                            </div>
                                            <div>
                                                <label className={`${styles.labelSmall} ${styles.labelIcon}`}>
                                                    <Clock size={12}/> Hạn chót <span className={styles.required}>*</span>
                                                </label>
                                                <input 
                                                    type="date"
                                                    value={ms.deadline}
                                                    onChange={e => handleMilestoneChange(index, 'deadline', e.target.value)}
                                                    className={styles.milestoneInput}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                             <label className={styles.labelSmall}>Yêu cầu đầu ra (Deliverables)</label>
                                             <input 
                                                value={ms.description}
                                                onChange={e => handleMilestoneChange(index, 'description', e.target.value)}
                                                placeholder="VD: File PDF báo cáo, Diagram ảnh..."
                                                className={styles.milestoneInput}
                                             />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                         {/* Nút thêm mốc ở cuối timeline */}
                        <div className={styles.addMilestoneWrapper}>
                             <div className={styles.addMilestoneDot}><div className={styles.addMilestoneDotInner}></div></div>
                             <button type="button" onClick={handleAddMilestone} className={styles.addMilestoneButton}>
                                <Plus size={18}/> Thêm cột mốc tiếp theo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER SUBMIT */}
            <div className={styles.formFooter}>
                <div className={styles.milestoneCount}>Đã thiết lập <strong className={styles.milestoneCountNumber}>{milestones.length}</strong> cột mốc</div>
                <button onClick={handleSubmit} className={styles.submitButton}>
                    <CheckCircle size={18} /> Hoàn tất & Tạo Dự Án
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
