using ProjectService.Enums;

namespace ProjectService.Models;

public class ProjectInstance
{
    public Guid Id { get; set; }
    public Guid ProjectTemplateId { get; set; } 
    public string CourseId { get; set; } = string.Empty; 
    public InstanceStatus Status { get; set; } = InstanceStatus.Ongoing;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public ProjectTemplate? ProjectTemplate { get; set; }
}
