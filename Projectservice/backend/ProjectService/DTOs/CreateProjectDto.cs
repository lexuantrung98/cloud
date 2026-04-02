namespace ProjectService.DTOs;

public class CreateProjectDto
{
    public string SubjectId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<CreateMilestoneDto> Milestones { get; set; } = new();
}

public class CreateMilestoneDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public List<string> Questions { get; set; } = new();
}
