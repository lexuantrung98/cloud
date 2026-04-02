namespace AccountService.DTOs
{
    public class ImportResultDto
    {
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> ErrorDetails { get; set; } = new List<string>();
    }
}