namespace ProjectService.DTOs;

public class UpdateTaskStatusDto
{
    public Guid TaskId { get; set; }
    public ProjectService.Enums.TaskStatus NewStatus { get; set; }
}
