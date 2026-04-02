using ProjectService.Enums;

namespace ProjectService.Models; 

public class ProjectTemplate
{
    public Guid Id { get; set; }
    public string SubjectId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
    public DateTime? Deadline { get; set; }
    public string? AssignedClassIds { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? ApproverId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public ICollection<ProjectMilestone> Milestones { get; set; } = new List<ProjectMilestone>();
    
}
