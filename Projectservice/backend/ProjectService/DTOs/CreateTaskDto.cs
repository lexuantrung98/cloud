namespace ProjectService.DTOs;

public class CreateTaskDto
{
    public Guid GroupId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? Deadline { get; set; }
    public List<string> AssignedStudentIds { get; set; } = new();
}
