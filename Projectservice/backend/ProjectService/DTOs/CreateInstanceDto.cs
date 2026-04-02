namespace ProjectService.DTOs;

public class CreateInstanceDto
{
    public Guid ProjectTemplateId { get; set; } 
    public string CourseId { get; set; } = string.Empty; 
}
