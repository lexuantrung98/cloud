namespace ProjectService.Models;

public class TaskAssignee
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string StudentId { get; set; } = string.Empty;

    public ProjectTask? Task { get; set; }
}
