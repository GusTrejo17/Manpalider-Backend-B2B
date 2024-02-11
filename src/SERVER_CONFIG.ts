class SERVER_CONFIG {
    HOST: string = "localhost";
    PORT: number = 3001;

    SQL: boolean = true;

    HANADB: string = 'localhost:30015';
    DATABASE: string = 'Handel_B2B';
    SAPDB: string = 'Ha';
    USER: string = "";
    PASSWORD: string = '';
}
export default new SERVER_CONFIG();