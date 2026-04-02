namespace ProjectService.Models;

public class ProjectGroup
{
    public Guid Id { get; set; }
    public Guid? ProjectTemplateId { get; set; } // Nullable - nhóm có thể chưa được assign project
    public string Name { get; set; } = string.Empty; 
    public string ClassId { get; set; } = string.Empty;
    public string? SubjectCode { get; set; } // Mã môn học (VD: "LT2", "DL1") - để dễ filter
    public int MaxMembers { get; set; } = 5; // Số lượng thành viên tối đa (default: 5)
    
    // Final project grading
    public decimal? FinalGrade { get; set; } // Điểm cuối (0-10), nullable
    public string? FinalGradeFeedback { get; set; } // Đánh giá, nhận xét
    public DateTime? FinalGradedAt { get; set; } // Thời điểm chấm
    public string? FinalGradedBy { get; set; } // Lecturer ID/Email đã chấm
    
    // Soft delete support
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    
    public ProjectTemplate? ProjectTemplate { get; set; }
    public ICollection<ProjectGroupMember> Members { get; set; } = new List<ProjectGroupMember>();
}
