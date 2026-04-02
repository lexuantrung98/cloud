namespace ProjectService.Models;

public class ProjectMilestone
{
    public Guid Id { get; set; }
    public Guid ProjectTemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public DateTime? Deadline { get; set; }

    public ProjectTemplate? ProjectTemplate { get; set; }
    
    public ICollection<MilestoneQuestion> Questions { get; set; } = new List<MilestoneQuestion>();
}

public class MilestoneQuestion
{
    public Guid Id { get; set; }
    public Guid MilestoneId { get; set; }
    public string Question { get; set; } = string.Empty;

    public ProjectMilestone? Milestone { get; set; }
}
