namespace ProjectService.DTOs;

public class CreateGroupDto
{
    public Guid ProjectInstanceId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public List<string> StudentIds { get; set; } = new();
}
